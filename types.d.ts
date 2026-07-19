declare module 'px-map-events' {
  function fn<T>(ref: T): { [key in T]: string[] }
  export default fn
}
