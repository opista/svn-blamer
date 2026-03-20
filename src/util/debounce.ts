export const debounce = <This, Args extends unknown[], R>(
    fn: (this: This, ...args: Args) => R,
    ms = 200,
) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return function (this: This, ...args: Args) {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            fn.apply(this, args);
        }, ms);
    };
};
