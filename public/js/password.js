// Password hashing for the browser-local profile gate.
// This preserves the existing sign-up/login experience without adding API routes.
// It is not a replacement for production server-side authentication.

const ITERATIONS = 120000;
const KEY_LENGTH_BITS = 256;
const encoder = new TextEncoder();

const bytesToBase64 = (bytes) => {
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
};

const base64ToBytes = (value) => {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const derivePasswordHash = async (password, salt, iterations = ITERATIONS) => {
    if (!window.crypto?.subtle) {
        throw new Error('This browser does not support secure local password hashing.');
    }

    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits'],
    );

    const derivedBits = await window.crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt,
            iterations,
            hash: 'SHA-256',
        },
        keyMaterial,
        KEY_LENGTH_BITS,
    );

    return new Uint8Array(derivedBits);
};

const equalBytes = (left, right) => {
    if (left.length !== right.length) return false;

    let difference = 0;
    for (let index = 0; index < left.length; index += 1) {
        difference |= left[index] ^ right[index];
    }
    return difference === 0;
};

export const createPasswordRecord = async (password) => {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const hash = await derivePasswordHash(password, salt, ITERATIONS);

    return {
        passwordHash: bytesToBase64(hash),
        passwordSalt: bytesToBase64(salt),
        passwordIterations: ITERATIONS,
    };
};

export const verifyPassword = async (password, user) => {
    if (!user?.passwordHash || !user?.passwordSalt) {
        return false;
    }

    try {
        const salt = base64ToBytes(user.passwordSalt);
        const expectedHash = base64ToBytes(user.passwordHash);
        const actualHash = await derivePasswordHash(
            password,
            salt,
            Number(user.passwordIterations) || ITERATIONS,
        );

        return equalBytes(actualHash, expectedHash);
    } catch (error) {
        console.error('Unable to verify local profile password:', error);
        return false;
    }
};
