class Controller {
  constructor() {
    // Manual binding of all methods to 'this'
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
    methods.forEach((method) => {
      if (method !== "constructor" && typeof this[method] === "function") {
        this[method] = this[method].bind(this);
      }
    });
  }

  error(message, status) {
    let err = new Error(message);
    err.status = status;
    throw err;
  }
}

module.exports = Controller;
