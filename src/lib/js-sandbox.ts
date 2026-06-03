import { getQuickJS } from 'quickjs-emscripten';

export type SandboxResult =
    | { ok: true; value: unknown }
    | { ok: false; error: string };

/**
 * Run untrusted user JavaScript in a fully isolated QuickJS (WASM) sandbox.
 *
 * The code runs as the body of `function(input){ ... }` and whatever it returns
 * becomes the result. It has NO access to the host: no Node built-ins, no
 * network, no filesystem, no env — only the `input` value we pass in. Memory
 * and execution time are capped. This is what makes it safe to expose a
 * "code node" to multi-tenant customers.
 */
export async function runUserJs(
    code: string,
    input: unknown,
    opts?: { timeoutMs?: number; memoryBytes?: number },
): Promise<SandboxResult> {
    const QuickJS = await getQuickJS();
    const runtime = QuickJS.newRuntime();
    runtime.setMemoryLimit(opts?.memoryBytes ?? 16 * 1024 * 1024); // 16 MB
    runtime.setMaxStackSize(1024 * 1024);

    const deadline = Date.now() + (opts?.timeoutMs ?? 1000);
    runtime.setInterruptHandler(() => Date.now() > deadline);

    const vm = runtime.newContext();
    try {
        let inputLiteral: string;
        try {
            inputLiteral = JSON.stringify(input ?? null);
        } catch {
            return { ok: false, error: 'El payload de entrada no es serializable a JSON.' };
        }

        const wrapped = `(function(input){\n${code}\n})(${inputLiteral})`;
        const result = vm.evalCode(wrapped);

        if (result.error) {
            const dumped = vm.dump(result.error);
            result.error.dispose();
            const message =
                dumped && typeof dumped === 'object' && 'message' in dumped
                    ? String((dumped as { message: unknown }).message)
                    : String(dumped);
            return { ok: false, error: message };
        }

        const value = vm.dump(result.value);
        result.value.dispose();
        return { ok: true, value };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error ejecutando el código.' };
    } finally {
        vm.dispose();
        runtime.dispose();
    }
}
