export const debounce = <T extends (...args: any[]) => unknown>(fn: T, ms = 200) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            fn.apply(this, args);
        }, ms);
    };
};
