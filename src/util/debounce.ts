export const debounce = <T extends (...args: any[]) => any>(fn: T, ms = 200) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
        timer = setTimeout(fn.bind(this, ...args), ms);
    };
};
