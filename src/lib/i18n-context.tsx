'use client';

import { createContext, useContext } from 'react';

type Dictionary = Record<string, any>;

const DictionaryContext = createContext<Dictionary>({});

export function DictionaryProvider({
    dictionary,
    children,
}: {
    dictionary: Dictionary;
    children: React.ReactNode;
}) {
    return (
        <DictionaryContext.Provider value={dictionary}>
            {children}
        </DictionaryContext.Provider>
    );
}

export function useDictionary() {
    return useContext(DictionaryContext);
}
