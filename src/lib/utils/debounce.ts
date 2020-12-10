export const debounce = (func: () => void, delay: number): (() => void) => {
    let timeout: number;
    return () => {
        const later = () => {
          window.clearTimeout(timeout);
          func();
        };
    
        window.clearTimeout(timeout);
        timeout = window.setTimeout(later, delay);
      };
}