export function debounce<F extends (...args: any[]) => void>(fn: F, delay: number) {
  let timer: any;
  return (...args: Parameters<F>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
