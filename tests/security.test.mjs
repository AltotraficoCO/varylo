import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { applySessionUpdate } from '../src/lib/session-update.ts';
import { authConfig } from '../src/auth.config.ts';

const token = { sub: 'alice', id: 'alice', role: 'AGENT', companyId: 'own' };
const forged = { sub: 'root', id: 'root', role: 'SUPER_ADMIN', companyId: 'victim', actingCompanyId: 'victim', exp: 9999999999 };
const user = { id: 'alice', role: 'AGENT', companyId: 'own' };
const deps = (role = 'AGENT') => ({
    findUser: async id => { assert.equal(id, 'alice'); return { ...user, role }; },
    companyExists: async id => id === 'target',
});

test('shared JWT callback ignores all client claims', async () => {
    assert.deepEqual(await authConfig.callbacks.jwt({ token: { ...token }, trigger: 'update', session: forged }), token);
});
test('ordinary user cannot change identity, role, tenant, expiry or impersonate', async () => {
    assert.deepEqual(await applySessionUpdate(token, forged, deps()), { ...token, actingCompanyId: null });
});
test('super admin can enter and exit only an existing company', async () => {
    const entered = await applySessionUpdate(token, { ...forged, actingCompanyId: 'target' }, deps('SUPER_ADMIN'));
    assert.deepEqual(entered, { ...token, role: 'SUPER_ADMIN', actingCompanyId: 'target' });
    const session = await authConfig.callbacks.session({ session: { user: {} }, token: entered });
    assert.equal(session.user.companyId, 'target');
    assert.equal(session.user.role, 'COMPANY_ADMIN');
    const exited = await applySessionUpdate(entered, { actingCompanyId: null }, deps('SUPER_ADMIN'));
    assert.equal(exited.actingCompanyId, null);
    const restored = await authConfig.callbacks.session({ session: { user: {} }, token: exited });
    assert.equal(restored.user.role, 'SUPER_ADMIN');
    assert.equal(restored.user.companyId, 'own');
});
test('invalid and missing targets cannot establish impersonation', async () => {
    for (const target of ['missing', '', 42, {}, [], true, 'a'.repeat(201)]) {
        const result = await applySessionUpdate(token, { actingCompanyId: target }, deps('SUPER_ADMIN'));
        assert.equal(result.actingCompanyId, undefined);
    }
});
test('database role revocation clears existing impersonation', async () => {
    const result = await applySessionUpdate({ ...token, role: 'SUPER_ADMIN', actingCompanyId: 'target' }, forged, deps());
    assert.equal(result.role, 'AGENT');
    assert.equal(result.actingCompanyId, null);
});
test('missing subject/user fails closed; database failures propagate', async () => {
    assert.equal(await applySessionUpdate({ ...token, sub: undefined }, forged, deps()), null);
    assert.equal(await applySessionUpdate(token, forged, { ...deps(), findUser: async () => null }), null);
    await assert.rejects(applySessionUpdate(token, forged, { ...deps(), findUser: async () => { throw Error('offline'); } }), /offline/);
});
test('null and malformed update payloads cannot replace claims', async () => {
    for (const payload of [null, undefined, 'text', 5, [], {}]) {
        assert.deepEqual(await applySessionUpdate(token, payload, deps()), { ...token, actingCompanyId: null });
    }
});

// Execute the actual route with synthetic dependencies: no DB, network or secrets.
async function loadDiagnostic(session) {
    const calls = [];
    const context = vm.createContext({
        process: { env: {} },
        fetch: async (url, options) => {
            calls.push({ url, options });
            assert.ok(!options?.method || options.method === 'GET');
            assert.ok(!url.includes('/register'));
            return { ok: true, json: async () => ({ data: [] }) };
        },
    });
    const bindings = {
        'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } },
        '@/auth': { auth: async () => session },
        '@/lib/prisma': { prisma: { channel: { findFirst: async ({ where }) => {
            assert.equal(where.companyId, 'own');
            return { id: 'channel', configJson: { accessToken: 'dummy', phoneNumberId: 'phone', wabaId: 'waba' } };
        } } } },
        '@prisma/client': { ChannelType: { WHATSAPP: 'WHATSAPP' } },
        '@/lib/channel-config': { readChannelSecret: () => 'dummy' },
    };
    const source = await readFile(new URL('../src/app/api/debug/whatsapp/route.ts', import.meta.url), 'utf8');
    const mod = new vm.SourceTextModule(stripTypeScriptTypes(source), { context });
    await mod.link(specifier => {
        const values = bindings[specifier];
        return new vm.SyntheticModule(Object.keys(values), function () {
            for (const [key, value] of Object.entries(values)) this.setExport(key, value);
        }, { context });
    });
    await mod.evaluate();
    return { response: await mod.namespace.GET({}), calls };
}
test('WhatsApp diagnostic only reads and never exposes token preview', async () => {
    const { response, calls } = await loadDiagnostic({ user: { companyId: 'own', role: 'COMPANY_ADMIN' } });
    assert.equal(response.status, 200);
    assert.equal(calls.length, 5);
    assert.equal(response.body.tokenPreview, undefined);
    assert.equal(response.body.registerAttempt, undefined);
    assert.equal(response.body.subscribeAttempt, undefined);
});
test('WhatsApp diagnostic rejects unauthenticated and ordinary users before I/O', async () => {
    for (const [session, status] of [[null, 401], [{ user: { companyId: 'own', role: 'AGENT' } }, 403]]) {
        const result = await loadDiagnostic(session);
        assert.equal(result.response.status, status);
        assert.equal(result.calls.length, 0);
    }
});

test('server Auth.js callback wires database authorization into update only', async () => {
    let config;
    let reads = 0;
    const context = vm.createContext({});
    const bindings = {
        'next-auth': { default: options => { config = options; return {}; } },
        '@auth/prisma-adapter': { PrismaAdapter: () => ({}) },
        '@/lib/prisma': { prisma: {
            user: { findUnique: async ({ where }) => { reads++; assert.equal(where.id, 'alice'); return user; } },
            company: { findUnique: async () => { throw Error('ordinary users must not query target'); } },
        } },
        './auth.config': { authConfig },
        './lib/session-update': { applySessionUpdate },
        'next-auth/providers/credentials': { default: value => value },
        'zod': { z: {} },
        'bcryptjs': { default: {} },
        '@prisma/client': { Role: {} },
    };
    const source = await readFile(new URL('../src/auth.ts', import.meta.url), 'utf8');
    const mod = new vm.SourceTextModule(stripTypeScriptTypes(source), { context });
    await mod.link(specifier => {
        const values = bindings[specifier];
        return new vm.SyntheticModule(Object.keys(values), function () {
            for (const [key, value] of Object.entries(values)) this.setExport(key, value);
        }, { context });
    });
    await mod.evaluate();
    const result = await config.callbacks.jwt({ token: { ...token }, trigger: 'update', session: forged });
    assert.equal(reads, 1);
    assert.deepEqual(result, { ...token, actingCompanyId: null });
    await config.callbacks.jwt({ token: { ...token } });
    assert.equal(reads, 1);
});


test('sign-in without an authenticated user id fails closed', async () => {
    assert.equal(await authConfig.callbacks.jwt({ token: {}, user: { role: 'AGENT', companyId: 'own' } }), null);
});
