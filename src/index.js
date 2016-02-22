import { createHashHistory, createHistory } from 'history';
import createRecognizer from './createRecognizer';

/**
 * Define route
 *
 * @param {string}            path       Path of current route. This is always relative to parent.
 *                                       E.g. if "/user" is defined as a child of "/home", it will
 *                                       recongnize url of "/home/user"
 * @param {string}            name       Name of current route
 * @param {RouteDefinition[]} [children] Child routes
 *
 * @return {RouteDefinition} The RouteDefinition is simply an object with three properties:
 *                           {
 *                           	 path: string;
 *                           	 name: string;
 *                           	 children: RouteDefinition[];
 *                           }
 */
function r(path, name, children = null) {
  return {path, name, children};
}

/**
 * Define redirect route
 *
 * @param {string} path       Path of current route. Same as "path" argument of "r"
 * @param {string} targetPath Redirect destination. Should be an absolute path.
 *
 * @return {RedirectDefinition} Similar to RouteDefinition:
 *                              {
 *                              	path: string;
 *                              	targetPath: string;
 *                              }
 */
function redirect(path, targetPath) {
  return { path, targetPath };
}

/**
 * Start listen to route changes
 *
 * @param {RouteDefinition} definition The definition generated by "r"
 * @param {Function}        handler    Will only be called when first start routing,
 *                                     then on every time user use browser back and
 *                                     forward button to navigate.
 * @param {Object}          opts
 * @param {Object}          [opts.browserHistory = false] If true, will use HTML5 push state to update URL
 * @param {Object}          [opts._history]               **TESTING ONLY** used to stub history instance with in memory history
 *
 * @return {navTo} A function to help update current route and get current state
 */
function start(definition, handler, { browserHistory = false, _history } = {}) {
  const recongnize = createRecognizer(definition);
  const history = _history || (() => (browserHistory ? createHistory : createHashHistory)())();

  let ignoreNext = false;
  let currentPath = null;
  let currentState;

  history.listen(({ pathname, search, action }) => {
    currentPath = pathname + search;

    if (ignoreNext) {
      ignoreNext = false;
      return;
    }

    currentState = recongnize(currentPath);

    if (!currentState) {
      throw new Error(`cannot recongnize ${currentPath}`);
    }

    if (currentState.redirectTo) {
      ignoreNext = true;
      history.push(currentState.redirectTo);
    }

    handler(currentState);
  });

  return function navTo(path) {
    if (!path || path === currentPath) {
      return currentState;
    }

    history.push(path);
    // Route change listen handler is sync,
    // so we can return new state within the same run loop
    return currentState;
  };
}

/**
 * Take definition generated by "r" and a path, return the corresponding state
 *
 * @param {RouteDefinition} definition
 * @param {string}          path
 *
 * @return {Object}
 */
function parse(definition, path) {
  const recongnize = createRecognizer(definition);

  if (arguments.length > 1) {
    return recongnize(path);
  }

  return function (path) {
    return recongnize(path);
  };
}

export {
  r,
  redirect,
  start,
  parse,
};
