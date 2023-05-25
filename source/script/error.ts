export function panic(message: string, redirect?: string): never {
    alert(message);
    if (redirect) {
        window.location.assign(redirect);
    }
    throw new Error(message);
}
