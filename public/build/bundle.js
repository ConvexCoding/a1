
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function _extends() {
      _extends = Object.assign || function (target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];

          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }

        return target;
      };

      return _extends.apply(this, arguments);
    }

    var DEFAULT_CONFIG = {
      // minimum relative difference between two compared values,
      // used by all comparison functions
      epsilon: 1e-12,
      // type of default matrix output. Choose 'matrix' (default) or 'array'
      matrix: 'Matrix',
      // type of default number output. Choose 'number' (default) 'BigNumber', or 'Fraction
      number: 'number',
      // number of significant digits in BigNumbers
      precision: 64,
      // predictable output type of functions. When true, output type depends only
      // on the input types. When false (default), output type can vary depending
      // on input values. For example `math.sqrt(-4)` returns `complex('2i')` when
      // predictable is false, and returns `NaN` when true.
      predictable: false,
      // random seed for seeded pseudo random number generation
      // null = randomly seed
      randomSeed: null
    };

    // type checks for all known types
    //
    // note that:
    //
    // - check by duck-typing on a property like `isUnit`, instead of checking instanceof.
    //   instanceof cannot be used because that would not allow to pass data from
    //   one instance of math.js to another since each has it's own instance of Unit.
    // - check the `isUnit` property via the constructor, so there will be no
    //   matches for "fake" instances like plain objects with a property `isUnit`.
    //   That is important for security reasons.
    // - It must not be possible to override the type checks used internally,
    //   for security reasons, so these functions are not exposed in the expression
    //   parser.
    function isNumber(x) {
      return typeof x === 'number';
    }
    function isBigNumber(x) {
      if (!x || typeof x !== 'object' || typeof x.constructor !== 'function') {
        return false;
      }

      if (x.isBigNumber === true && typeof x.constructor.prototype === 'object' && x.constructor.prototype.isBigNumber === true) {
        return true;
      }

      if (typeof x.constructor.isDecimal === 'function' && x.constructor.isDecimal(x) === true) {
        return true;
      }

      return false;
    }
    function isComplex(x) {
      return x && typeof x === 'object' && Object.getPrototypeOf(x).isComplex === true || false;
    }
    function isFraction(x) {
      return x && typeof x === 'object' && Object.getPrototypeOf(x).isFraction === true || false;
    }
    function isUnit(x) {
      return x && x.constructor.prototype.isUnit === true || false;
    }
    function isString(x) {
      return typeof x === 'string';
    }
    var isArray = Array.isArray;
    function isMatrix(x) {
      return x && x.constructor.prototype.isMatrix === true || false;
    }
    /**
     * Test whether a value is a collection: an Array or Matrix
     * @param {*} x
     * @returns {boolean} isCollection
     */

    function isCollection(x) {
      return Array.isArray(x) || isMatrix(x);
    }
    function isDenseMatrix(x) {
      return x && x.isDenseMatrix && x.constructor.prototype.isMatrix === true || false;
    }
    function isSparseMatrix(x) {
      return x && x.isSparseMatrix && x.constructor.prototype.isMatrix === true || false;
    }
    function isRange(x) {
      return x && x.constructor.prototype.isRange === true || false;
    }
    function isIndex(x) {
      return x && x.constructor.prototype.isIndex === true || false;
    }
    function isBoolean(x) {
      return typeof x === 'boolean';
    }
    function isResultSet(x) {
      return x && x.constructor.prototype.isResultSet === true || false;
    }
    function isHelp(x) {
      return x && x.constructor.prototype.isHelp === true || false;
    }
    function isFunction(x) {
      return typeof x === 'function';
    }
    function isDate(x) {
      return x instanceof Date;
    }
    function isRegExp(x) {
      return x instanceof RegExp;
    }
    function isObject(x) {
      return !!(x && typeof x === 'object' && x.constructor === Object && !isComplex(x) && !isFraction(x));
    }
    function isNull(x) {
      return x === null;
    }
    function isUndefined(x) {
      return x === undefined;
    }
    function isAccessorNode(x) {
      return x && x.isAccessorNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isArrayNode(x) {
      return x && x.isArrayNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isAssignmentNode(x) {
      return x && x.isAssignmentNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isBlockNode(x) {
      return x && x.isBlockNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isConditionalNode(x) {
      return x && x.isConditionalNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isConstantNode(x) {
      return x && x.isConstantNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isFunctionAssignmentNode(x) {
      return x && x.isFunctionAssignmentNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isFunctionNode(x) {
      return x && x.isFunctionNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isIndexNode(x) {
      return x && x.isIndexNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isNode(x) {
      return x && x.isNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isObjectNode(x) {
      return x && x.isObjectNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isOperatorNode(x) {
      return x && x.isOperatorNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isParenthesisNode(x) {
      return x && x.isParenthesisNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isRangeNode(x) {
      return x && x.isRangeNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isSymbolNode(x) {
      return x && x.isSymbolNode === true && x.constructor.prototype.isNode === true || false;
    }
    function isChain(x) {
      return x && x.constructor.prototype.isChain === true || false;
    }
    function typeOf(x) {
      var t = typeof x;

      if (t === 'object') {
        // JavaScript types
        if (x === null) return 'null';
        if (Array.isArray(x)) return 'Array';
        if (x instanceof Date) return 'Date';
        if (x instanceof RegExp) return 'RegExp'; // math.js types

        if (isBigNumber(x)) return 'BigNumber';
        if (isComplex(x)) return 'Complex';
        if (isFraction(x)) return 'Fraction';
        if (isMatrix(x)) return 'Matrix';
        if (isUnit(x)) return 'Unit';
        if (isIndex(x)) return 'Index';
        if (isRange(x)) return 'Range';
        if (isResultSet(x)) return 'ResultSet';
        if (isNode(x)) return x.type;
        if (isChain(x)) return 'Chain';
        if (isHelp(x)) return 'Help';
        return 'Object';
      }

      if (t === 'function') return 'Function';
      return t; // can be 'string', 'number', 'boolean', ...
    }

    /**
     * Clone an object
     *
     *     clone(x)
     *
     * Can clone any primitive type, array, and object.
     * If x has a function clone, this function will be invoked to clone the object.
     *
     * @param {*} x
     * @return {*} clone
     */

    function clone(x) {
      var type = typeof x; // immutable primitive types

      if (type === 'number' || type === 'string' || type === 'boolean' || x === null || x === undefined) {
        return x;
      } // use clone function of the object when available


      if (typeof x.clone === 'function') {
        return x.clone();
      } // array


      if (Array.isArray(x)) {
        return x.map(function (value) {
          return clone(value);
        });
      }

      if (x instanceof Date) return new Date(x.valueOf());
      if (isBigNumber(x)) return x; // bignumbers are immutable

      if (x instanceof RegExp) throw new TypeError('Cannot clone ' + x); // TODO: clone a RegExp
      // object

      return mapObject(x, clone);
    }
    /**
     * Apply map to all properties of an object
     * @param {Object} object
     * @param {function} callback
     * @return {Object} Returns a copy of the object with mapped properties
     */

    function mapObject(object, callback) {
      var clone = {};

      for (var key in object) {
        if (hasOwnProperty(object, key)) {
          clone[key] = callback(object[key]);
        }
      }

      return clone;
    }
    /**
     * Deep test equality of all fields in two pairs of arrays or objects.
     * Compares values and functions strictly (ie. 2 is not the same as '2').
     * @param {Array | Object} a
     * @param {Array | Object} b
     * @returns {boolean}
     */

    function deepStrictEqual(a, b) {
      var prop, i, len;

      if (Array.isArray(a)) {
        if (!Array.isArray(b)) {
          return false;
        }

        if (a.length !== b.length) {
          return false;
        }

        for (i = 0, len = a.length; i < len; i++) {
          if (!deepStrictEqual(a[i], b[i])) {
            return false;
          }
        }

        return true;
      } else if (typeof a === 'function') {
        return a === b;
      } else if (a instanceof Object) {
        if (Array.isArray(b) || !(b instanceof Object)) {
          return false;
        }

        for (prop in a) {
          // noinspection JSUnfilteredForInLoop
          if (!(prop in b) || !deepStrictEqual(a[prop], b[prop])) {
            return false;
          }
        }

        for (prop in b) {
          // noinspection JSUnfilteredForInLoop
          if (!(prop in a)) {
            return false;
          }
        }

        return true;
      } else {
        return a === b;
      }
    }
    /**
     * A safe hasOwnProperty
     * @param {Object} object
     * @param {string} property
     */

    function hasOwnProperty(object, property) {
      return object && Object.hasOwnProperty.call(object, property);
    }
    /**
     * Shallow version of pick, creating an object composed of the picked object properties
     * but not for nested properties
     * @param {Object} object
     * @param {string[]} properties
     * @return {Object}
     */

    function pickShallow(object, properties) {
      var copy = {};

      for (var i = 0; i < properties.length; i++) {
        var key = properties[i];
        var value = object[key];

        if (value !== undefined) {
          copy[key] = value;
        }
      }

      return copy;
    }

    var MATRIX_OPTIONS = ['Matrix', 'Array']; // valid values for option matrix

    var NUMBER_OPTIONS = ['number', 'BigNumber', 'Fraction']; // valid values for option number

    var config = function config(options) {
      if (options) {
        throw new Error('The global config is readonly. \n' + 'Please create a mathjs instance if you want to change the default configuration. \n' + 'Example:\n' + '\n' + '  import { create, all } from \'mathjs\';\n' + '  const mathjs = create(all);\n' + '  mathjs.config({ number: \'BigNumber\' });\n');
      }

      return Object.freeze(DEFAULT_CONFIG);
    };

    _extends(config, DEFAULT_CONFIG, {
      MATRIX_OPTIONS,
      NUMBER_OPTIONS
    });

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    /**
     * typed-function
     *
     * Type checking for JavaScript functions
     *
     * https://github.com/josdejong/typed-function
     */

    var typedFunction = createCommonjsModule(function (module, exports) {

    (function (root, factory) {
      {
        // OldNode. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like OldNode.
        module.exports = factory();
      }
    }(commonjsGlobal, function () {

      function ok () {
        return true;
      }

      function notOk () {
        return false;
      }

      function undef () {
        return undefined;
      }

      /**
       * @typedef {{
       *   params: Param[],
       *   fn: function
       * }} Signature
       *
       * @typedef {{
       *   types: Type[],
       *   restParam: boolean
       * }} Param
       *
       * @typedef {{
       *   name: string,
       *   typeIndex: number,
       *   test: function,
       *   conversion?: ConversionDef,
       *   conversionIndex: number,
       * }} Type
       *
       * @typedef {{
       *   from: string,
       *   to: string,
       *   convert: function (*) : *
       * }} ConversionDef
       *
       * @typedef {{
       *   name: string,
       *   test: function(*) : boolean
       * }} TypeDef
       */

      // create a new instance of typed-function
      function create () {
        // data type tests
        var _types = [
          { name: 'number',    test: function (x) { return typeof x === 'number' } },
          { name: 'string',    test: function (x) { return typeof x === 'string' } },
          { name: 'boolean',   test: function (x) { return typeof x === 'boolean' } },
          { name: 'Function',  test: function (x) { return typeof x === 'function'} },
          { name: 'Array',     test: Array.isArray },
          { name: 'Date',      test: function (x) { return x instanceof Date } },
          { name: 'RegExp',    test: function (x) { return x instanceof RegExp } },
          { name: 'Object',    test: function (x) {
            return typeof x === 'object' && x !== null && x.constructor === Object
          }},
          { name: 'null',      test: function (x) { return x === null } },
          { name: 'undefined', test: function (x) { return x === undefined } }
        ];

        var anyType = {
          name: 'any',
          test: ok
        };

        // types which need to be ignored
        var _ignore = [];

        // type conversions
        var _conversions = [];

        // This is a temporary object, will be replaced with a typed function at the end
        var typed = {
          types: _types,
          conversions: _conversions,
          ignore: _ignore
        };

        /**
         * Find the test function for a type
         * @param {String} typeName
         * @return {TypeDef} Returns the type definition when found,
         *                    Throws a TypeError otherwise
         */
        function findTypeByName (typeName) {
          var entry = findInArray(typed.types, function (entry) {
            return entry.name === typeName;
          });

          if (entry) {
            return entry;
          }

          if (typeName === 'any') { // special baked-in case 'any'
            return anyType;
          }

          var hint = findInArray(typed.types, function (entry) {
            return entry.name.toLowerCase() === typeName.toLowerCase();
          });

          throw new TypeError('Unknown type "' + typeName + '"' +
              (hint ? ('. Did you mean "' + hint.name + '"?') : ''));
        }

        /**
         * Find the index of a type definition. Handles special case 'any'
         * @param {TypeDef} type
         * @return {number}
         */
        function findTypeIndex(type) {
          if (type === anyType) {
            return 999;
          }

          return typed.types.indexOf(type);
        }

        /**
         * Find a type that matches a value.
         * @param {*} value
         * @return {string} Returns the name of the first type for which
         *                  the type test matches the value.
         */
        function findTypeName(value) {
          var entry = findInArray(typed.types, function (entry) {
            return entry.test(value);
          });

          if (entry) {
            return entry.name;
          }

          throw new TypeError('Value has unknown type. Value: ' + value);
        }

        /**
         * Find a specific signature from a (composed) typed function, for example:
         *
         *   typed.find(fn, ['number', 'string'])
         *   typed.find(fn, 'number, string')
         *
         * Function find only only works for exact matches.
         *
         * @param {Function} fn                   A typed-function
         * @param {string | string[]} signature   Signature to be found, can be
         *                                        an array or a comma separated string.
         * @return {Function}                     Returns the matching signature, or
         *                                        throws an error when no signature
         *                                        is found.
         */
        function find (fn, signature) {
          if (!fn.signatures) {
            throw new TypeError('Function is no typed-function');
          }

          // normalize input
          var arr;
          if (typeof signature === 'string') {
            arr = signature.split(',');
            for (var i = 0; i < arr.length; i++) {
              arr[i] = arr[i].trim();
            }
          }
          else if (Array.isArray(signature)) {
            arr = signature;
          }
          else {
            throw new TypeError('String array or a comma separated string expected');
          }

          var str = arr.join(',');

          // find an exact match
          var match = fn.signatures[str];
          if (match) {
            return match;
          }

          // TODO: extend find to match non-exact signatures

          throw new TypeError('Signature not found (signature: ' + (fn.name || 'unnamed') + '(' + arr.join(', ') + '))');
        }

        /**
         * Convert a given value to another data type.
         * @param {*} value
         * @param {string} type
         */
        function convert (value, type) {
          var from = findTypeName(value);

          // check conversion is needed
          if (type === from) {
            return value;
          }

          for (var i = 0; i < typed.conversions.length; i++) {
            var conversion = typed.conversions[i];
            if (conversion.from === from && conversion.to === type) {
              return conversion.convert(value);
            }
          }

          throw new Error('Cannot convert from ' + from + ' to ' + type);
        }
        
        /**
         * Stringify parameters in a normalized way
         * @param {Param[]} params
         * @return {string}
         */
        function stringifyParams (params) {
          return params
              .map(function (param) {
                var typeNames = param.types.map(getTypeName);

                return (param.restParam ? '...' : '') + typeNames.join('|');
              })
              .join(',');
        }

        /**
         * Parse a parameter, like "...number | boolean"
         * @param {string} param
         * @param {ConversionDef[]} conversions
         * @return {Param} param
         */
        function parseParam (param, conversions) {
          var restParam = param.indexOf('...') === 0;
          var types = (!restParam)
              ? param
              : (param.length > 3)
                  ? param.slice(3)
                  : 'any';

          var typeNames = types.split('|').map(trim)
              .filter(notEmpty)
              .filter(notIgnore);

          var matchingConversions = filterConversions(conversions, typeNames);

          var exactTypes = typeNames.map(function (typeName) {
            var type = findTypeByName(typeName);

            return {
              name: typeName,
              typeIndex: findTypeIndex(type),
              test: type.test,
              conversion: null,
              conversionIndex: -1
            };
          });

          var convertibleTypes = matchingConversions.map(function (conversion) {
            var type = findTypeByName(conversion.from);

            return {
              name: conversion.from,
              typeIndex: findTypeIndex(type),
              test: type.test,
              conversion: conversion,
              conversionIndex: conversions.indexOf(conversion)
            };
          });

          return {
            types: exactTypes.concat(convertibleTypes),
            restParam: restParam
          };
        }

        /**
         * Parse a signature with comma separated parameters,
         * like "number | boolean, ...string"
         * @param {string} signature
         * @param {function} fn
         * @param {ConversionDef[]} conversions
         * @return {Signature | null} signature
         */
        function parseSignature (signature, fn, conversions) {
          var params = [];

          if (signature.trim() !== '') {
            params = signature
                .split(',')
                .map(trim)
                .map(function (param, index, array) {
                  var parsedParam = parseParam(param, conversions);

                  if (parsedParam.restParam && (index !== array.length - 1)) {
                    throw new SyntaxError('Unexpected rest parameter "' + param + '": ' +
                        'only allowed for the last parameter');
                  }

                  return parsedParam;
              });
          }

          if (params.some(isInvalidParam)) {
            // invalid signature: at least one parameter has no types
            // (they may have been filtered)
            return null;
          }

          return {
            params: params,
            fn: fn
          };
        }

        /**
         * Test whether a set of params contains a restParam
         * @param {Param[]} params
         * @return {boolean} Returns true when the last parameter is a restParam
         */
        function hasRestParam(params) {
          var param = last(params);
          return param ? param.restParam : false;
        }

        /**
         * Test whether a parameter contains conversions
         * @param {Param} param
         * @return {boolean} Returns true when at least one of the parameters
         *                   contains a conversion.
         */
        function hasConversions(param) {
          return param.types.some(function (type) {
            return type.conversion != null;
          });
        }

        /**
         * Create a type test for a single parameter, which can have one or multiple
         * types.
         * @param {Param} param
         * @return {function(x: *) : boolean} Returns a test function
         */
        function compileTest(param) {
          if (!param || param.types.length === 0) {
            // nothing to do
            return ok;
          }
          else if (param.types.length === 1) {
            return findTypeByName(param.types[0].name).test;
          }
          else if (param.types.length === 2) {
            var test0 = findTypeByName(param.types[0].name).test;
            var test1 = findTypeByName(param.types[1].name).test;
            return function or(x) {
              return test0(x) || test1(x);
            }
          }
          else { // param.types.length > 2
            var tests = param.types.map(function (type) {
              return findTypeByName(type.name).test;
            });
            return function or(x) {
              for (var i = 0; i < tests.length; i++) {
                if (tests[i](x)) {
                  return true;
                }
              }
              return false;
            }
          }
        }

        /**
         * Create a test for all parameters of a signature
         * @param {Param[]} params
         * @return {function(args: Array<*>) : boolean}
         */
        function compileTests(params) {
          var tests, test0, test1;

          if (hasRestParam(params)) {
            // variable arguments like '...number'
            tests = initial(params).map(compileTest);
            var varIndex = tests.length;
            var lastTest = compileTest(last(params));
            var testRestParam = function (args) {
              for (var i = varIndex; i < args.length; i++) {
                if (!lastTest(args[i])) {
                  return false;
                }
              }
              return true;
            };

            return function testArgs(args) {
              for (var i = 0; i < tests.length; i++) {
                if (!tests[i](args[i])) {
                  return false;
                }
              }
              return testRestParam(args) && (args.length >= varIndex + 1);
            };
          }
          else {
            // no variable arguments
            if (params.length === 0) {
              return function testArgs(args) {
                return args.length === 0;
              };
            }
            else if (params.length === 1) {
              test0 = compileTest(params[0]);
              return function testArgs(args) {
                return test0(args[0]) && args.length === 1;
              };
            }
            else if (params.length === 2) {
              test0 = compileTest(params[0]);
              test1 = compileTest(params[1]);
              return function testArgs(args) {
                return test0(args[0]) && test1(args[1]) && args.length === 2;
              };
            }
            else { // arguments.length > 2
              tests = params.map(compileTest);
              return function testArgs(args) {
                for (var i = 0; i < tests.length; i++) {
                  if (!tests[i](args[i])) {
                    return false;
                  }
                }
                return args.length === tests.length;
              };
            }
          }
        }

        /**
         * Find the parameter at a specific index of a signature.
         * Handles rest parameters.
         * @param {Signature} signature
         * @param {number} index
         * @return {Param | null} Returns the matching parameter when found,
         *                        null otherwise.
         */
        function getParamAtIndex(signature, index) {
          return index < signature.params.length
              ? signature.params[index]
              : hasRestParam(signature.params)
                  ? last(signature.params)
                  : null
        }

        /**
         * Get all type names of a parameter
         * @param {Signature} signature
         * @param {number} index
         * @param {boolean} excludeConversions
         * @return {string[]} Returns an array with type names
         */
        function getExpectedTypeNames (signature, index, excludeConversions) {
          var param = getParamAtIndex(signature, index);
          var types = param
              ? excludeConversions
                      ? param.types.filter(isExactType)
                      : param.types
              : [];

          return types.map(getTypeName);
        }

        /**
         * Returns the name of a type
         * @param {Type} type
         * @return {string} Returns the type name
         */
        function getTypeName(type) {
          return type.name;
        }

        /**
         * Test whether a type is an exact type or conversion
         * @param {Type} type
         * @return {boolean} Returns true when
         */
        function isExactType(type) {
          return type.conversion === null || type.conversion === undefined;
        }

        /**
         * Helper function for creating error messages: create an array with
         * all available types on a specific argument index.
         * @param {Signature[]} signatures
         * @param {number} index
         * @return {string[]} Returns an array with available types
         */
        function mergeExpectedParams(signatures, index) {
          var typeNames = uniq(flatMap(signatures, function (signature) {
            return getExpectedTypeNames(signature, index, false);
          }));

          return (typeNames.indexOf('any') !== -1) ? ['any'] : typeNames;
        }

        /**
         * Create
         * @param {string} name             The name of the function
         * @param {array.<*>} args          The actual arguments passed to the function
         * @param {Signature[]} signatures  A list with available signatures
         * @return {TypeError} Returns a type error with additional data
         *                     attached to it in the property `data`
         */
        function createError(name, args, signatures) {
          var err, expected;
          var _name = name || 'unnamed';

          // test for wrong type at some index
          var matchingSignatures = signatures;
          var index;
          for (index = 0; index < args.length; index++) {
            var nextMatchingDefs = matchingSignatures.filter(function (signature) {
              var test = compileTest(getParamAtIndex(signature, index));
              return (index < signature.params.length || hasRestParam(signature.params)) &&
                  test(args[index]);
            });

            if (nextMatchingDefs.length === 0) {
              // no matching signatures anymore, throw error "wrong type"
              expected = mergeExpectedParams(matchingSignatures, index);
              if (expected.length > 0) {
                var actualType = findTypeName(args[index]);

                err = new TypeError('Unexpected type of argument in function ' + _name +
                    ' (expected: ' + expected.join(' or ') +
                    ', actual: ' + actualType + ', index: ' + index + ')');
                err.data = {
                  category: 'wrongType',
                  fn: _name,
                  index: index,
                  actual: actualType,
                  expected: expected
                };
                return err;
              }
            }
            else {
              matchingSignatures = nextMatchingDefs;
            }
          }

          // test for too few arguments
          var lengths = matchingSignatures.map(function (signature) {
            return hasRestParam(signature.params) ? Infinity : signature.params.length;
          });
          if (args.length < Math.min.apply(null, lengths)) {
            expected = mergeExpectedParams(matchingSignatures, index);
            err = new TypeError('Too few arguments in function ' + _name +
                ' (expected: ' + expected.join(' or ') +
                ', index: ' + args.length + ')');
            err.data = {
              category: 'tooFewArgs',
              fn: _name,
              index: args.length,
              expected: expected
            };
            return err;
          }

          // test for too many arguments
          var maxLength = Math.max.apply(null, lengths);
          if (args.length > maxLength) {
            err = new TypeError('Too many arguments in function ' + _name +
                ' (expected: ' + maxLength + ', actual: ' + args.length + ')');
            err.data = {
              category: 'tooManyArgs',
              fn: _name,
              index: args.length,
              expectedLength: maxLength
            };
            return err;
          }

          err = new TypeError('Arguments of type "' + args.join(', ') +
              '" do not match any of the defined signatures of function ' + _name + '.');
          err.data = {
            category: 'mismatch',
            actual: args.map(findTypeName)
          };
          return err;
        }

        /**
         * Find the lowest index of all exact types of a parameter (no conversions)
         * @param {Param} param
         * @return {number} Returns the index of the lowest type in typed.types
         */
        function getLowestTypeIndex (param) {
          var min = 999;

          for (var i = 0; i < param.types.length; i++) {
            if (isExactType(param.types[i])) {
              min = Math.min(min, param.types[i].typeIndex);
            }
          }

          return min;
        }

        /**
         * Find the lowest index of the conversion of all types of the parameter
         * having a conversion
         * @param {Param} param
         * @return {number} Returns the lowest index of the conversions of this type
         */
        function getLowestConversionIndex (param) {
          var min = 999;

          for (var i = 0; i < param.types.length; i++) {
            if (!isExactType(param.types[i])) {
              min = Math.min(min, param.types[i].conversionIndex);
            }
          }

          return min;
        }

        /**
         * Compare two params
         * @param {Param} param1
         * @param {Param} param2
         * @return {number} returns a negative number when param1 must get a lower
         *                  index than param2, a positive number when the opposite,
         *                  or zero when both are equal
         */
        function compareParams (param1, param2) {
          var c;

          // compare having a rest parameter or not
          c = param1.restParam - param2.restParam;
          if (c !== 0) {
            return c;
          }

          // compare having conversions or not
          c = hasConversions(param1) - hasConversions(param2);
          if (c !== 0) {
            return c;
          }

          // compare the index of the types
          c = getLowestTypeIndex(param1) - getLowestTypeIndex(param2);
          if (c !== 0) {
            return c;
          }

          // compare the index of any conversion
          return getLowestConversionIndex(param1) - getLowestConversionIndex(param2);
        }

        /**
         * Compare two signatures
         * @param {Signature} signature1
         * @param {Signature} signature2
         * @return {number} returns a negative number when param1 must get a lower
         *                  index than param2, a positive number when the opposite,
         *                  or zero when both are equal
         */
        function compareSignatures (signature1, signature2) {
          var len = Math.min(signature1.params.length, signature2.params.length);
          var i;
          var c;

          // compare whether the params have conversions at all or not
          c = signature1.params.some(hasConversions) - signature2.params.some(hasConversions);
          if (c !== 0) {
            return c;
          }

          // next compare whether the params have conversions one by one
          for (i = 0; i < len; i++) {
            c = hasConversions(signature1.params[i]) - hasConversions(signature2.params[i]);
            if (c !== 0) {
              return c;
            }
          }

          // compare the types of the params one by one
          for (i = 0; i < len; i++) {
            c = compareParams(signature1.params[i], signature2.params[i]);
            if (c !== 0) {
              return c;
            }
          }

          // compare the number of params
          return signature1.params.length - signature2.params.length;
        }

        /**
         * Get params containing all types that can be converted to the defined types.
         *
         * @param {ConversionDef[]} conversions
         * @param {string[]} typeNames
         * @return {ConversionDef[]} Returns the conversions that are available
         *                        for every type (if any)
         */
        function filterConversions(conversions, typeNames) {
          var matches = {};

          conversions.forEach(function (conversion) {
            if (typeNames.indexOf(conversion.from) === -1 &&
                typeNames.indexOf(conversion.to) !== -1 &&
                !matches[conversion.from]) {
              matches[conversion.from] = conversion;
            }
          });

          return Object.keys(matches).map(function (from) {
            return matches[from];
          });
        }

        /**
         * Preprocess arguments before calling the original function:
         * - if needed convert the parameters
         * - in case of rest parameters, move the rest parameters into an Array
         * @param {Param[]} params
         * @param {function} fn
         * @return {function} Returns a wrapped function
         */
        function compileArgsPreprocessing(params, fn) {
          var fnConvert = fn;

          // TODO: can we make this wrapper function smarter/simpler?

          if (params.some(hasConversions)) {
            var restParam = hasRestParam(params);
            var compiledConversions = params.map(compileArgConversion);

            fnConvert = function convertArgs() {
              var args = [];
              var last = restParam ? arguments.length - 1 : arguments.length;
              for (var i = 0; i < last; i++) {
                args[i] = compiledConversions[i](arguments[i]);
              }
              if (restParam) {
                args[last] = arguments[last].map(compiledConversions[last]);
              }

              return fn.apply(this, args);
            };
          }

          var fnPreprocess = fnConvert;
          if (hasRestParam(params)) {
            var offset = params.length - 1;

            fnPreprocess = function preprocessRestParams () {
              return fnConvert.apply(this,
                  slice(arguments, 0, offset).concat([slice(arguments, offset)]));
            };
          }

          return fnPreprocess;
        }

        /**
         * Compile conversion for a parameter to the right type
         * @param {Param} param
         * @return {function} Returns the wrapped function that will convert arguments
         *
         */
        function compileArgConversion(param) {
          var test0, test1, conversion0, conversion1;
          var tests = [];
          var conversions = [];

          param.types.forEach(function (type) {
            if (type.conversion) {
              tests.push(findTypeByName(type.conversion.from).test);
              conversions.push(type.conversion.convert);
            }
          });

          // create optimized conversion functions depending on the number of conversions
          switch (conversions.length) {
            case 0:
              return function convertArg(arg) {
                return arg;
              }

            case 1:
              test0 = tests[0];
              conversion0 = conversions[0];
              return function convertArg(arg) {
                if (test0(arg)) {
                  return conversion0(arg)
                }
                return arg;
              }

            case 2:
              test0 = tests[0];
              test1 = tests[1];
              conversion0 = conversions[0];
              conversion1 = conversions[1];
              return function convertArg(arg) {
                if (test0(arg)) {
                  return conversion0(arg)
                }
                if (test1(arg)) {
                  return conversion1(arg)
                }
                return arg;
              }

            default:
              return function convertArg(arg) {
                for (var i = 0; i < conversions.length; i++) {
                  if (tests[i](arg)) {
                    return conversions[i](arg);
                  }
                }
                return arg;
              }
          }
        }

        /**
         * Convert an array with signatures into a map with signatures,
         * where signatures with union types are split into separate signatures
         *
         * Throws an error when there are conflicting types
         *
         * @param {Signature[]} signatures
         * @return {Object.<string, function>}  Returns a map with signatures
         *                                      as key and the original function
         *                                      of this signature as value.
         */
        function createSignaturesMap(signatures) {
          var signaturesMap = {};
          signatures.forEach(function (signature) {
            if (!signature.params.some(hasConversions)) {
              splitParams(signature.params, true).forEach(function (params) {
                signaturesMap[stringifyParams(params)] = signature.fn;
              });
            }
          });

          return signaturesMap;
        }

        /**
         * Split params with union types in to separate params.
         *
         * For example:
         *
         *     splitParams([['Array', 'Object'], ['string', 'RegExp'])
         *     // returns:
         *     // [
         *     //   ['Array', 'string'],
         *     //   ['Array', 'RegExp'],
         *     //   ['Object', 'string'],
         *     //   ['Object', 'RegExp']
         *     // ]
         *
         * @param {Param[]} params
         * @param {boolean} ignoreConversionTypes
         * @return {Param[]}
         */
        function splitParams(params, ignoreConversionTypes) {
          function _splitParams(params, index, types) {
            if (index < params.length) {
              var param = params[index];
              var filteredTypes = ignoreConversionTypes
                  ? param.types.filter(isExactType)
                  : param.types;
              var typeGroups;

              if (param.restParam) {
                // split the types of a rest parameter in two:
                // one with only exact types, and one with exact types and conversions
                var exactTypes = filteredTypes.filter(isExactType);
                typeGroups = exactTypes.length < filteredTypes.length
                    ? [exactTypes, filteredTypes]
                    : [filteredTypes];

              }
              else {
                // split all the types of a regular parameter into one type per group
                typeGroups = filteredTypes.map(function (type) {
                  return [type]
                });
              }

              // recurse over the groups with types
              return flatMap(typeGroups, function (typeGroup) {
                return _splitParams(params, index + 1, types.concat([typeGroup]));
              });

            }
            else {
              // we've reached the end of the parameters. Now build a new Param
              var splittedParams = types.map(function (type, typeIndex) {
                return {
                  types: type,
                  restParam: (typeIndex === params.length - 1) && hasRestParam(params)
                }
              });

              return [splittedParams];
            }
          }

          return _splitParams(params, 0, []);
        }

        /**
         * Test whether two signatures have a conflicting signature
         * @param {Signature} signature1
         * @param {Signature} signature2
         * @return {boolean} Returns true when the signatures conflict, false otherwise.
         */
        function hasConflictingParams(signature1, signature2) {
          var ii = Math.max(signature1.params.length, signature2.params.length);

          for (var i = 0; i < ii; i++) {
            var typesNames1 = getExpectedTypeNames(signature1, i, true);
            var typesNames2 = getExpectedTypeNames(signature2, i, true);

            if (!hasOverlap(typesNames1, typesNames2)) {
              return false;
            }
          }

          var len1 = signature1.params.length;
          var len2 = signature2.params.length;
          var restParam1 = hasRestParam(signature1.params);
          var restParam2 = hasRestParam(signature2.params);

          return restParam1
              ? restParam2 ? (len1 === len2) : (len2 >= len1)
              : restParam2 ? (len1 >= len2)  : (len1 === len2)
        }

        /**
         * Create a typed function
         * @param {String} name               The name for the typed function
         * @param {Object.<string, function>} signaturesMap
         *                                    An object with one or
         *                                    multiple signatures as key, and the
         *                                    function corresponding to the
         *                                    signature as value.
         * @return {function}  Returns the created typed function.
         */
        function createTypedFunction(name, signaturesMap) {
          if (Object.keys(signaturesMap).length === 0) {
            throw new SyntaxError('No signatures provided');
          }

          // parse the signatures, and check for conflicts
          var parsedSignatures = [];
          Object.keys(signaturesMap)
              .map(function (signature) {
                return parseSignature(signature, signaturesMap[signature], typed.conversions);
              })
              .filter(notNull)
              .forEach(function (parsedSignature) {
                // check whether this parameter conflicts with already parsed signatures
                var conflictingSignature = findInArray(parsedSignatures, function (s) {
                  return hasConflictingParams(s, parsedSignature)
                });
                if (conflictingSignature) {
                  throw new TypeError('Conflicting signatures "' +
                      stringifyParams(conflictingSignature.params) + '" and "' +
                      stringifyParams(parsedSignature.params) + '".');
                }

                parsedSignatures.push(parsedSignature);
              });

          // split and filter the types of the signatures, and then order them
          var signatures = flatMap(parsedSignatures, function (parsedSignature) {
            var params = parsedSignature ? splitParams(parsedSignature.params, false) : [];

            return params.map(function (params) {
              return {
                params: params,
                fn: parsedSignature.fn
              };
            });
          }).filter(notNull);

          signatures.sort(compareSignatures);

          // we create a highly optimized checks for the first couple of signatures with max 2 arguments
          var ok0 = signatures[0] && signatures[0].params.length <= 2 && !hasRestParam(signatures[0].params);
          var ok1 = signatures[1] && signatures[1].params.length <= 2 && !hasRestParam(signatures[1].params);
          var ok2 = signatures[2] && signatures[2].params.length <= 2 && !hasRestParam(signatures[2].params);
          var ok3 = signatures[3] && signatures[3].params.length <= 2 && !hasRestParam(signatures[3].params);
          var ok4 = signatures[4] && signatures[4].params.length <= 2 && !hasRestParam(signatures[4].params);
          var ok5 = signatures[5] && signatures[5].params.length <= 2 && !hasRestParam(signatures[5].params);
          var allOk = ok0 && ok1 && ok2 && ok3 && ok4 && ok5;

          // compile the tests
          var tests = signatures.map(function (signature) {
            return compileTests(signature.params);
          });

          var test00 = ok0 ? compileTest(signatures[0].params[0]) : notOk;
          var test10 = ok1 ? compileTest(signatures[1].params[0]) : notOk;
          var test20 = ok2 ? compileTest(signatures[2].params[0]) : notOk;
          var test30 = ok3 ? compileTest(signatures[3].params[0]) : notOk;
          var test40 = ok4 ? compileTest(signatures[4].params[0]) : notOk;
          var test50 = ok5 ? compileTest(signatures[5].params[0]) : notOk;

          var test01 = ok0 ? compileTest(signatures[0].params[1]) : notOk;
          var test11 = ok1 ? compileTest(signatures[1].params[1]) : notOk;
          var test21 = ok2 ? compileTest(signatures[2].params[1]) : notOk;
          var test31 = ok3 ? compileTest(signatures[3].params[1]) : notOk;
          var test41 = ok4 ? compileTest(signatures[4].params[1]) : notOk;
          var test51 = ok5 ? compileTest(signatures[5].params[1]) : notOk;

          // compile the functions
          var fns = signatures.map(function(signature) {
            return compileArgsPreprocessing(signature.params, signature.fn);
          });

          var fn0 = ok0 ? fns[0] : undef;
          var fn1 = ok1 ? fns[1] : undef;
          var fn2 = ok2 ? fns[2] : undef;
          var fn3 = ok3 ? fns[3] : undef;
          var fn4 = ok4 ? fns[4] : undef;
          var fn5 = ok5 ? fns[5] : undef;

          var len0 = ok0 ? signatures[0].params.length : -1;
          var len1 = ok1 ? signatures[1].params.length : -1;
          var len2 = ok2 ? signatures[2].params.length : -1;
          var len3 = ok3 ? signatures[3].params.length : -1;
          var len4 = ok4 ? signatures[4].params.length : -1;
          var len5 = ok5 ? signatures[5].params.length : -1;

          // simple and generic, but also slow
          var iStart = allOk ? 6 : 0;
          var iEnd = signatures.length;
          var generic = function generic() {

            for (var i = iStart; i < iEnd; i++) {
              if (tests[i](arguments)) {
                return fns[i].apply(this, arguments);
              }
            }

            return typed.onMismatch(name, arguments, signatures);
          };

          // create the typed function
          // fast, specialized version. Falls back to the slower, generic one if needed
          var fn = function fn(arg0, arg1) {

            if (arguments.length === len0 && test00(arg0) && test01(arg1)) { return fn0.apply(fn, arguments); }
            if (arguments.length === len1 && test10(arg0) && test11(arg1)) { return fn1.apply(fn, arguments); }
            if (arguments.length === len2 && test20(arg0) && test21(arg1)) { return fn2.apply(fn, arguments); }
            if (arguments.length === len3 && test30(arg0) && test31(arg1)) { return fn3.apply(fn, arguments); }
            if (arguments.length === len4 && test40(arg0) && test41(arg1)) { return fn4.apply(fn, arguments); }
            if (arguments.length === len5 && test50(arg0) && test51(arg1)) { return fn5.apply(fn, arguments); }

            return generic.apply(fn, arguments);
          };

          // attach name the typed function
          try {
            Object.defineProperty(fn, 'name', {value: name});
          }
          catch (err) {
            // old browsers do not support Object.defineProperty and some don't support setting the name property
            // the function name is not essential for the functioning, it's mostly useful for debugging,
            // so it's fine to have unnamed functions.
          }

          // attach signatures to the function
          fn.signatures = createSignaturesMap(signatures);

          return fn;
        }

        /**
         * Action to take on mismatch
         * @param {string} name      Name of function that was attempted to be called
         * @param {Array} args       Actual arguments to the call
         * @param {Array} signatures Known signatures of the named typed-function
         */
        function _onMismatch(name, args, signatures) {
          throw createError(name, args, signatures);
        }

        /**
         * Test whether a type should be NOT be ignored
         * @param {string} typeName
         * @return {boolean}
         */
        function notIgnore(typeName) {
          return typed.ignore.indexOf(typeName) === -1;
        }

        /**
         * trim a string
         * @param {string} str
         * @return {string}
         */
        function trim(str) {
          return str.trim();
        }

        /**
         * Test whether a string is not empty
         * @param {string} str
         * @return {boolean}
         */
        function notEmpty(str) {
          return !!str;
        }

        /**
         * test whether a value is not strict equal to null
         * @param {*} value
         * @return {boolean}
         */
        function notNull(value) {
          return value !== null;
        }

        /**
         * Test whether a parameter has no types defined
         * @param {Param} param
         * @return {boolean}
         */
        function isInvalidParam (param) {
          return param.types.length === 0;
        }

        /**
         * Return all but the last items of an array
         * @param {Array} arr
         * @return {Array}
         */
        function initial(arr) {
          return arr.slice(0, arr.length - 1);
        }

        /**
         * return the last item of an array
         * @param {Array} arr
         * @return {*}
         */
        function last(arr) {
          return arr[arr.length - 1];
        }

        /**
         * Slice an array or function Arguments
         * @param {Array | Arguments | IArguments} arr
         * @param {number} start
         * @param {number} [end]
         * @return {Array}
         */
        function slice(arr, start, end) {
          return Array.prototype.slice.call(arr, start, end);
        }

        /**
         * Test whether an array contains some item
         * @param {Array} array
         * @param {*} item
         * @return {boolean} Returns true if array contains item, false if not.
         */
        function contains(array, item) {
          return array.indexOf(item) !== -1;
        }

        /**
         * Test whether two arrays have overlapping items
         * @param {Array} array1
         * @param {Array} array2
         * @return {boolean} Returns true when at least one item exists in both arrays
         */
        function hasOverlap(array1, array2) {
          for (var i = 0; i < array1.length; i++) {
            if (contains(array2, array1[i])) {
              return true;
            }
          }

          return false;
        }

        /**
         * Return the first item from an array for which test(arr[i]) returns true
         * @param {Array} arr
         * @param {function} test
         * @return {* | undefined} Returns the first matching item
         *                         or undefined when there is no match
         */
        function findInArray(arr, test) {
          for (var i = 0; i < arr.length; i++) {
            if (test(arr[i])) {
              return arr[i];
            }
          }
          return undefined;
        }

        /**
         * Filter unique items of an array with strings
         * @param {string[]} arr
         * @return {string[]}
         */
        function uniq(arr) {
          var entries = {};
          for (var i = 0; i < arr.length; i++) {
            entries[arr[i]] = true;
          }
          return Object.keys(entries);
        }

        /**
         * Flat map the result invoking a callback for every item in an array.
         * https://gist.github.com/samgiles/762ee337dff48623e729
         * @param {Array} arr
         * @param {function} callback
         * @return {Array}
         */
        function flatMap(arr, callback) {
          return Array.prototype.concat.apply([], arr.map(callback));
        }

        /**
         * Retrieve the function name from a set of typed functions,
         * and check whether the name of all functions match (if given)
         * @param {function[]} fns
         */
        function getName (fns) {
          var name = '';

          for (var i = 0; i < fns.length; i++) {
            var fn = fns[i];

            // check whether the names are the same when defined
            if ((typeof fn.signatures === 'object' || typeof fn.signature === 'string') && fn.name !== '') {
              if (name === '') {
                name = fn.name;
              }
              else if (name !== fn.name) {
                var err = new Error('Function names do not match (expected: ' + name + ', actual: ' + fn.name + ')');
                err.data = {
                  actual: fn.name,
                  expected: name
                };
                throw err;
              }
            }
          }

          return name;
        }

        // extract and merge all signatures of a list with typed functions
        function extractSignatures(fns) {
          var err;
          var signaturesMap = {};

          function validateUnique(_signature, _fn) {
            if (signaturesMap.hasOwnProperty(_signature) && _fn !== signaturesMap[_signature]) {
              err = new Error('Signature "' + _signature + '" is defined twice');
              err.data = {signature: _signature};
              throw err;
              // else: both signatures point to the same function, that's fine
            }
          }

          for (var i = 0; i < fns.length; i++) {
            var fn = fns[i];

            // test whether this is a typed-function
            if (typeof fn.signatures === 'object') {
              // merge the signatures
              for (var signature in fn.signatures) {
                if (fn.signatures.hasOwnProperty(signature)) {
                  validateUnique(signature, fn.signatures[signature]);
                  signaturesMap[signature] = fn.signatures[signature];
                }
              }
            }
            else if (typeof fn.signature === 'string') {
              validateUnique(fn.signature, fn);
              signaturesMap[fn.signature] = fn;
            }
            else {
              err = new TypeError('Function is no typed-function (index: ' + i + ')');
              err.data = {index: i};
              throw err;
            }
          }

          return signaturesMap;
        }

        typed = createTypedFunction('typed', {
          'string, Object': createTypedFunction,
          'Object': function (signaturesMap) {
            // find existing name
            var fns = [];
            for (var signature in signaturesMap) {
              if (signaturesMap.hasOwnProperty(signature)) {
                fns.push(signaturesMap[signature]);
              }
            }
            var name = getName(fns);
            return createTypedFunction(name, signaturesMap);
          },
          '...Function': function (fns) {
            return createTypedFunction(getName(fns), extractSignatures(fns));
          },
          'string, ...Function': function (name, fns) {
            return createTypedFunction(name, extractSignatures(fns));
          }
        });

        typed.create = create;
        typed.types = _types;
        typed.conversions = _conversions;
        typed.ignore = _ignore;
        typed.onMismatch = _onMismatch;
        typed.throwMismatchError = _onMismatch;
        typed.createError = createError;
        typed.convert = convert;
        typed.find = find;

        /**
         * add a type
         * @param {{name: string, test: function}} type
         * @param {boolean} [beforeObjectTest=true]
         *                          If true, the new test will be inserted before
         *                          the test with name 'Object' (if any), since
         *                          tests for Object match Array and classes too.
         */
        typed.addType = function (type, beforeObjectTest) {
          if (!type || typeof type.name !== 'string' || typeof type.test !== 'function') {
            throw new TypeError('Object with properties {name: string, test: function} expected');
          }

          if (beforeObjectTest !== false) {
            for (var i = 0; i < typed.types.length; i++) {
              if (typed.types[i].name === 'Object') {
                typed.types.splice(i, 0, type);
                return
              }
            }
          }

          typed.types.push(type);
        };

        // add a conversion
        typed.addConversion = function (conversion) {
          if (!conversion
              || typeof conversion.from !== 'string'
              || typeof conversion.to !== 'string'
              || typeof conversion.convert !== 'function') {
            throw new TypeError('Object with properties {from: string, to: string, convert: function} expected');
          }

          typed.conversions.push(conversion);
        };

        return typed;
      }

      return create();
    }));
    });

    /**
     * @typedef {{sign: '+' | '-' | '', coefficients: number[], exponent: number}} SplitValue
     */

    /**
     * Check if a number is integer
     * @param {number | boolean} value
     * @return {boolean} isInteger
     */

    function isInteger(value) {
      if (typeof value === 'boolean') {
        return true;
      }

      return isFinite(value) ? value === Math.round(value) : false;
    }
    /**
     * Formats a number in a given base
     * @param {number} n
     * @param {number} base
     * @param {number} size
     * @returns {string}
     */

    function formatNumberToBase(n, base, size) {
      var prefixes = {
        2: '0b',
        8: '0o',
        16: '0x'
      };
      var prefix = prefixes[base];
      var suffix = '';

      if (size) {
        if (size < 1) {
          throw new Error('size must be in greater than 0');
        }

        if (!isInteger(size)) {
          throw new Error('size must be an integer');
        }

        if (n > 2 ** (size - 1) - 1 || n < -(2 ** (size - 1))) {
          throw new Error("Value must be in range [-2^".concat(size - 1, ", 2^").concat(size - 1, "-1]"));
        }

        if (!isInteger(n)) {
          throw new Error('Value must be an integer');
        }

        if (n < 0) {
          n = n + 2 ** size;
        }

        suffix = "i".concat(size);
      }

      var sign = '';

      if (n < 0) {
        n = -n;
        sign = '-';
      }

      return "".concat(sign).concat(prefix).concat(n.toString(base)).concat(suffix);
    }
    /**
     * Convert a number to a formatted string representation.
     *
     * Syntax:
     *
     *    format(value)
     *    format(value, options)
     *    format(value, precision)
     *    format(value, fn)
     *
     * Where:
     *
     *    {number} value   The value to be formatted
     *    {Object} options An object with formatting options. Available options:
     *                     {string} notation
     *                         Number notation. Choose from:
     *                         'fixed'          Always use regular number notation.
     *                                          For example '123.40' and '14000000'
     *                         'exponential'    Always use exponential notation.
     *                                          For example '1.234e+2' and '1.4e+7'
     *                         'engineering'    Always use engineering notation.
     *                                          For example '123.4e+0' and '14.0e+6'
     *                         'auto' (default) Regular number notation for numbers
     *                                          having an absolute value between
     *                                          `lowerExp` and `upperExp` bounds, and
     *                                          uses exponential notation elsewhere.
     *                                          Lower bound is included, upper bound
     *                                          is excluded.
     *                                          For example '123.4' and '1.4e7'.
     *                         'bin', 'oct, or
     *                         'hex'            Format the number using binary, octal,
     *                                          or hexadecimal notation.
     *                                          For example '0b1101' and '0x10fe'.
     *                     {number} wordSize    The word size in bits to use for formatting
     *                                          in binary, octal, or hexadecimal notation.
     *                                          To be used only with 'bin', 'oct', or 'hex'
     *                                          values for 'notation' option. When this option
     *                                          is defined the value is formatted as a signed
     *                                          twos complement integer of the given word size
     *                                          and the size suffix is appended to the output.
     *                                          For example
     *                                          format(-1, {notation: 'hex', wordSize: 8}) === '0xffi8'.
     *                                          Default value is undefined.
     *                     {number} precision   A number between 0 and 16 to round
     *                                          the digits of the number.
     *                                          In case of notations 'exponential',
     *                                          'engineering', and 'auto',
     *                                          `precision` defines the total
     *                                          number of significant digits returned.
     *                                          In case of notation 'fixed',
     *                                          `precision` defines the number of
     *                                          significant digits after the decimal
     *                                          point.
     *                                          `precision` is undefined by default,
     *                                          not rounding any digits.
     *                     {number} lowerExp    Exponent determining the lower boundary
     *                                          for formatting a value with an exponent
     *                                          when `notation='auto`.
     *                                          Default value is `-3`.
     *                     {number} upperExp    Exponent determining the upper boundary
     *                                          for formatting a value with an exponent
     *                                          when `notation='auto`.
     *                                          Default value is `5`.
     *    {Function} fn    A custom formatting function. Can be used to override the
     *                     built-in notations. Function `fn` is called with `value` as
     *                     parameter and must return a string. Is useful for example to
     *                     format all values inside a matrix in a particular way.
     *
     * Examples:
     *
     *    format(6.4)                                        // '6.4'
     *    format(1240000)                                    // '1.24e6'
     *    format(1/3)                                        // '0.3333333333333333'
     *    format(1/3, 3)                                     // '0.333'
     *    format(21385, 2)                                   // '21000'
     *    format(12.071, {notation: 'fixed'})                // '12'
     *    format(2.3,    {notation: 'fixed', precision: 2})  // '2.30'
     *    format(52.8,   {notation: 'exponential'})          // '5.28e+1'
     *    format(12345678, {notation: 'engineering'})        // '12.345678e+6'
     *
     * @param {number} value
     * @param {Object | Function | number} [options]
     * @return {string} str The formatted value
     */


    function format$2(value, options) {
      if (typeof options === 'function') {
        // handle format(value, fn)
        return options(value);
      } // handle special cases


      if (value === Infinity) {
        return 'Infinity';
      } else if (value === -Infinity) {
        return '-Infinity';
      } else if (isNaN(value)) {
        return 'NaN';
      } // default values for options


      var notation = 'auto';
      var precision;
      var wordSize;

      if (options) {
        // determine notation from options
        if (options.notation) {
          notation = options.notation;
        } // determine precision from options


        if (isNumber(options)) {
          precision = options;
        } else if (isNumber(options.precision)) {
          precision = options.precision;
        }

        if (options.wordSize) {
          wordSize = options.wordSize;

          if (typeof wordSize !== 'number') {
            throw new Error('Option "wordSize" must be a number');
          }
        }
      } // handle the various notations


      switch (notation) {
        case 'fixed':
          return toFixed$1(value, precision);

        case 'exponential':
          return toExponential$1(value, precision);

        case 'engineering':
          return toEngineering$1(value, precision);

        case 'bin':
          return formatNumberToBase(value, 2, wordSize);

        case 'oct':
          return formatNumberToBase(value, 8, wordSize);

        case 'hex':
          return formatNumberToBase(value, 16, wordSize);

        case 'auto':
          // remove trailing zeros after the decimal point
          return toPrecision(value, precision, options && options).replace(/((\.\d*?)(0+))($|e)/, function () {
            var digits = arguments[2];
            var e = arguments[4];
            return digits !== '.' ? digits + e : e;
          });

        default:
          throw new Error('Unknown notation "' + notation + '". ' + 'Choose "auto", "exponential", "fixed", "bin", "oct", or "hex.');
      }
    }
    /**
     * Split a number into sign, coefficients, and exponent
     * @param {number | string} value
     * @return {SplitValue}
     *              Returns an object containing sign, coefficients, and exponent
     */

    function splitNumber(value) {
      // parse the input value
      var match = String(value).toLowerCase().match(/^(-?)(\d+\.?\d*)(e([+-]?\d+))?$/);

      if (!match) {
        throw new SyntaxError('Invalid number ' + value);
      }

      var sign = match[1];
      var digits = match[2];
      var exponent = parseFloat(match[4] || '0');
      var dot = digits.indexOf('.');
      exponent += dot !== -1 ? dot - 1 : digits.length - 1;
      var coefficients = digits.replace('.', '') // remove the dot (must be removed before removing leading zeros)
      .replace(/^0*/, function (zeros) {
        // remove leading zeros, add their count to the exponent
        exponent -= zeros.length;
        return '';
      }).replace(/0*$/, '') // remove trailing zeros
      .split('').map(function (d) {
        return parseInt(d);
      });

      if (coefficients.length === 0) {
        coefficients.push(0);
        exponent++;
      }

      return {
        sign: sign,
        coefficients: coefficients,
        exponent: exponent
      };
    }
    /**
     * Format a number in engineering notation. Like '1.23e+6', '2.3e+0', '3.500e-3'
     * @param {number | string} value
     * @param {number} [precision]        Optional number of significant figures to return.
     */

    function toEngineering$1(value, precision) {
      if (isNaN(value) || !isFinite(value)) {
        return String(value);
      }

      var split = splitNumber(value);
      var rounded = roundDigits(split, precision);
      var e = rounded.exponent;
      var c = rounded.coefficients; // find nearest lower multiple of 3 for exponent

      var newExp = e % 3 === 0 ? e : e < 0 ? e - 3 - e % 3 : e - e % 3;

      if (isNumber(precision)) {
        // add zeroes to give correct sig figs
        while (precision > c.length || e - newExp + 1 > c.length) {
          c.push(0);
        }
      } else {
        // concatenate coefficients with necessary zeros
        // add zeros if necessary (for example: 1e+8 -> 100e+6)
        var missingZeros = Math.abs(e - newExp) - (c.length - 1);

        for (var i = 0; i < missingZeros; i++) {
          c.push(0);
        }
      } // find difference in exponents


      var expDiff = Math.abs(e - newExp);
      var decimalIdx = 1; // push decimal index over by expDiff times

      while (expDiff > 0) {
        decimalIdx++;
        expDiff--;
      } // if all coefficient values are zero after the decimal point and precision is unset, don't add a decimal value.
      // otherwise concat with the rest of the coefficients


      var decimals = c.slice(decimalIdx).join('');
      var decimalVal = isNumber(precision) && decimals.length || decimals.match(/[1-9]/) ? '.' + decimals : '';
      var str = c.slice(0, decimalIdx).join('') + decimalVal + 'e' + (e >= 0 ? '+' : '') + newExp.toString();
      return rounded.sign + str;
    }
    /**
     * Format a number with fixed notation.
     * @param {number | string} value
     * @param {number} [precision=undefined]  Optional number of decimals after the
     *                                        decimal point. null by default.
     */

    function toFixed$1(value, precision) {
      if (isNaN(value) || !isFinite(value)) {
        return String(value);
      }

      var splitValue = splitNumber(value);
      var rounded = typeof precision === 'number' ? roundDigits(splitValue, splitValue.exponent + 1 + precision) : splitValue;
      var c = rounded.coefficients;
      var p = rounded.exponent + 1; // exponent may have changed
      // append zeros if needed

      var pp = p + (precision || 0);

      if (c.length < pp) {
        c = c.concat(zeros$1(pp - c.length));
      } // prepend zeros if needed


      if (p < 0) {
        c = zeros$1(-p + 1).concat(c);
        p = 1;
      } // insert a dot if needed


      if (p < c.length) {
        c.splice(p, 0, p === 0 ? '0.' : '.');
      }

      return rounded.sign + c.join('');
    }
    /**
     * Format a number in exponential notation. Like '1.23e+5', '2.3e+0', '3.500e-3'
     * @param {number | string} value
     * @param {number} [precision]  Number of digits in formatted output.
     *                              If not provided, the maximum available digits
     *                              is used.
     */

    function toExponential$1(value, precision) {
      if (isNaN(value) || !isFinite(value)) {
        return String(value);
      } // round if needed, else create a clone


      var split = splitNumber(value);
      var rounded = precision ? roundDigits(split, precision) : split;
      var c = rounded.coefficients;
      var e = rounded.exponent; // append zeros if needed

      if (c.length < precision) {
        c = c.concat(zeros$1(precision - c.length));
      } // format as `C.CCCe+EEE` or `C.CCCe-EEE`


      var first = c.shift();
      return rounded.sign + first + (c.length > 0 ? '.' + c.join('') : '') + 'e' + (e >= 0 ? '+' : '') + e;
    }
    /**
     * Format a number with a certain precision
     * @param {number | string} value
     * @param {number} [precision=undefined] Optional number of digits.
     * @param {{lowerExp: number | undefined, upperExp: number | undefined}} [options]
     *                                       By default:
     *                                         lowerExp = -3 (incl)
     *                                         upper = +5 (excl)
     * @return {string}
     */

    function toPrecision(value, precision, options) {
      if (isNaN(value) || !isFinite(value)) {
        return String(value);
      } // determine lower and upper bound for exponential notation.


      var lowerExp = options && options.lowerExp !== undefined ? options.lowerExp : -3;
      var upperExp = options && options.upperExp !== undefined ? options.upperExp : 5;
      var split = splitNumber(value);
      var rounded = precision ? roundDigits(split, precision) : split;

      if (rounded.exponent < lowerExp || rounded.exponent >= upperExp) {
        // exponential notation
        return toExponential$1(value, precision);
      } else {
        var c = rounded.coefficients;
        var e = rounded.exponent; // append trailing zeros

        if (c.length < precision) {
          c = c.concat(zeros$1(precision - c.length));
        } // append trailing zeros
        // TODO: simplify the next statement


        c = c.concat(zeros$1(e - c.length + 1 + (c.length < precision ? precision - c.length : 0))); // prepend zeros

        c = zeros$1(-e).concat(c);
        var dot = e > 0 ? e : 0;

        if (dot < c.length - 1) {
          c.splice(dot + 1, 0, '.');
        }

        return rounded.sign + c.join('');
      }
    }
    /**
     * Round the number of digits of a number *
     * @param {SplitValue} split       A value split with .splitNumber(value)
     * @param {number} precision  A positive integer
     * @return {SplitValue}
     *              Returns an object containing sign, coefficients, and exponent
     *              with rounded digits
     */

    function roundDigits(split, precision) {
      // create a clone
      var rounded = {
        sign: split.sign,
        coefficients: split.coefficients,
        exponent: split.exponent
      };
      var c = rounded.coefficients; // prepend zeros if needed

      while (precision <= 0) {
        c.unshift(0);
        rounded.exponent++;
        precision++;
      }

      if (c.length > precision) {
        var removed = c.splice(precision, c.length - precision);

        if (removed[0] >= 5) {
          var i = precision - 1;
          c[i]++;

          while (c[i] === 10) {
            c.pop();

            if (i === 0) {
              c.unshift(0);
              rounded.exponent++;
              i++;
            }

            i--;
            c[i]++;
          }
        }
      }

      return rounded;
    }
    /**
     * Create an array filled with zeros.
     * @param {number} length
     * @return {Array}
     */

    function zeros$1(length) {
      var arr = [];

      for (var i = 0; i < length; i++) {
        arr.push(0);
      }

      return arr;
    }
    /**
     * Count the number of significant digits of a number.
     *
     * For example:
     *   2.34 returns 3
     *   0.0034 returns 2
     *   120.5e+30 returns 4
     *
     * @param {number} value
     * @return {number} digits   Number of significant digits
     */


    function digits(value) {
      return value.toExponential().replace(/e.*$/, '') // remove exponential notation
      .replace(/^0\.?0*|\./, '') // remove decimal point and leading zeros
      .length;
    }
    /**
     * Minimum number added to one that makes the result different than one
     */

    var DBL_EPSILON = Number.EPSILON || 2.2204460492503130808472633361816E-16;
    /**
     * Compares two floating point numbers.
     * @param {number} x          First value to compare
     * @param {number} y          Second value to compare
     * @param {number} [epsilon]  The maximum relative difference between x and y
     *                            If epsilon is undefined or null, the function will
     *                            test whether x and y are exactly equal.
     * @return {boolean} whether the two numbers are nearly equal
    */

    function nearlyEqual$1(x, y, epsilon) {
      // if epsilon is null or undefined, test whether x and y are exactly equal
      if (epsilon === null || epsilon === undefined) {
        return x === y;
      }

      if (x === y) {
        return true;
      } // NaN


      if (isNaN(x) || isNaN(y)) {
        return false;
      } // at this point x and y should be finite


      if (isFinite(x) && isFinite(y)) {
        // check numbers are very close, needed when comparing numbers near zero
        var diff = Math.abs(x - y);

        if (diff < DBL_EPSILON) {
          return true;
        } else {
          // use relative error
          return diff <= Math.max(Math.abs(x), Math.abs(y)) * epsilon;
        }
      } // Infinite and Number or negative Infinite and positive Infinite cases


      return false;
    }

    /**
     * Formats a BigNumber in a given base
     * @param {BigNumber} n
     * @param {number} base
     * @param {number} size
     * @returns {string}
     */

    function formatBigNumberToBase(n, base, size) {
      var BigNumberCtor = n.constructor;
      var big2 = new BigNumberCtor(2);
      var suffix = '';

      if (size) {
        if (size < 1) {
          throw new Error('size must be in greater than 0');
        }

        if (!isInteger(size)) {
          throw new Error('size must be an integer');
        }

        if (n.greaterThan(big2.pow(size - 1).sub(1)) || n.lessThan(big2.pow(size - 1).mul(-1))) {
          throw new Error("Value must be in range [-2^".concat(size - 1, ", 2^").concat(size - 1, "-1]"));
        }

        if (!n.isInteger()) {
          throw new Error('Value must be an integer');
        }

        if (n.lessThan(0)) {
          n = n.add(big2.pow(size));
        }

        suffix = "i".concat(size);
      }

      switch (base) {
        case 2:
          return "".concat(n.toBinary()).concat(suffix);

        case 8:
          return "".concat(n.toOctal()).concat(suffix);

        case 16:
          return "".concat(n.toHexadecimal()).concat(suffix);

        default:
          throw new Error("Base ".concat(base, " not supported "));
      }
    }
    /**
     * Convert a BigNumber to a formatted string representation.
     *
     * Syntax:
     *
     *    format(value)
     *    format(value, options)
     *    format(value, precision)
     *    format(value, fn)
     *
     * Where:
     *
     *    {number} value   The value to be formatted
     *    {Object} options An object with formatting options. Available options:
     *                     {string} notation
     *                         Number notation. Choose from:
     *                         'fixed'          Always use regular number notation.
     *                                          For example '123.40' and '14000000'
     *                         'exponential'    Always use exponential notation.
     *                                          For example '1.234e+2' and '1.4e+7'
     *                         'auto' (default) Regular number notation for numbers
     *                                          having an absolute value between
     *                                          `lower` and `upper` bounds, and uses
     *                                          exponential notation elsewhere.
     *                                          Lower bound is included, upper bound
     *                                          is excluded.
     *                                          For example '123.4' and '1.4e7'.
     *                         'bin', 'oct, or
     *                         'hex'            Format the number using binary, octal,
     *                                          or hexadecimal notation.
     *                                          For example '0b1101' and '0x10fe'.
     *                     {number} wordSize    The word size in bits to use for formatting
     *                                          in binary, octal, or hexadecimal notation.
     *                                          To be used only with 'bin', 'oct', or 'hex'
     *                                          values for 'notation' option. When this option
     *                                          is defined the value is formatted as a signed
     *                                          twos complement integer of the given word size
     *                                          and the size suffix is appended to the output.
     *                                          For example
     *                                          format(-1, {notation: 'hex', wordSize: 8}) === '0xffi8'.
     *                                          Default value is undefined.
     *                     {number} precision   A number between 0 and 16 to round
     *                                          the digits of the number.
     *                                          In case of notations 'exponential',
     *                                          'engineering', and 'auto',
     *                                          `precision` defines the total
     *                                          number of significant digits returned.
     *                                          In case of notation 'fixed',
     *                                          `precision` defines the number of
     *                                          significant digits after the decimal
     *                                          point.
     *                                          `precision` is undefined by default.
     *                     {number} lowerExp    Exponent determining the lower boundary
     *                                          for formatting a value with an exponent
     *                                          when `notation='auto`.
     *                                          Default value is `-3`.
     *                     {number} upperExp    Exponent determining the upper boundary
     *                                          for formatting a value with an exponent
     *                                          when `notation='auto`.
     *                                          Default value is `5`.
     *    {Function} fn    A custom formatting function. Can be used to override the
     *                     built-in notations. Function `fn` is called with `value` as
     *                     parameter and must return a string. Is useful for example to
     *                     format all values inside a matrix in a particular way.
     *
     * Examples:
     *
     *    format(6.4)                                        // '6.4'
     *    format(1240000)                                    // '1.24e6'
     *    format(1/3)                                        // '0.3333333333333333'
     *    format(1/3, 3)                                     // '0.333'
     *    format(21385, 2)                                   // '21000'
     *    format(12e8, {notation: 'fixed'})                  // returns '1200000000'
     *    format(2.3,    {notation: 'fixed', precision: 4})  // returns '2.3000'
     *    format(52.8,   {notation: 'exponential'})          // returns '5.28e+1'
     *    format(12400,  {notation: 'engineering'})          // returns '12.400e+3'
     *
     * @param {BigNumber} value
     * @param {Object | Function | number} [options]
     * @return {string} str The formatted value
     */


    function format$1(value, options) {
      if (typeof options === 'function') {
        // handle format(value, fn)
        return options(value);
      } // handle special cases


      if (!value.isFinite()) {
        return value.isNaN() ? 'NaN' : value.gt(0) ? 'Infinity' : '-Infinity';
      } // default values for options


      var notation = 'auto';
      var precision;
      var wordSize;

      if (options !== undefined) {
        // determine notation from options
        if (options.notation) {
          notation = options.notation;
        } // determine precision from options


        if (typeof options === 'number') {
          precision = options;
        } else if (options.precision) {
          precision = options.precision;
        }

        if (options.wordSize) {
          wordSize = options.wordSize;

          if (typeof wordSize !== 'number') {
            throw new Error('Option "wordSize" must be a number');
          }
        }
      } // handle the various notations


      switch (notation) {
        case 'fixed':
          return toFixed(value, precision);

        case 'exponential':
          return toExponential(value, precision);

        case 'engineering':
          return toEngineering(value, precision);

        case 'bin':
          return formatBigNumberToBase(value, 2, wordSize);

        case 'oct':
          return formatBigNumberToBase(value, 8, wordSize);

        case 'hex':
          return formatBigNumberToBase(value, 16, wordSize);

        case 'auto':
          {
            // determine lower and upper bound for exponential notation.
            // TODO: implement support for upper and lower to be BigNumbers themselves
            var lowerExp = options && options.lowerExp !== undefined ? options.lowerExp : -3;
            var upperExp = options && options.upperExp !== undefined ? options.upperExp : 5; // handle special case zero

            if (value.isZero()) return '0'; // determine whether or not to output exponential notation

            var str;
            var rounded = value.toSignificantDigits(precision);
            var exp = rounded.e;

            if (exp >= lowerExp && exp < upperExp) {
              // normal number notation
              str = rounded.toFixed();
            } else {
              // exponential notation
              str = toExponential(value, precision);
            } // remove trailing zeros after the decimal point


            return str.replace(/((\.\d*?)(0+))($|e)/, function () {
              var digits = arguments[2];
              var e = arguments[4];
              return digits !== '.' ? digits + e : e;
            });
          }

        default:
          throw new Error('Unknown notation "' + notation + '". ' + 'Choose "auto", "exponential", "fixed", "bin", "oct", or "hex.');
      }
    }
    /**
     * Format a BigNumber in engineering notation. Like '1.23e+6', '2.3e+0', '3.500e-3'
     * @param {BigNumber | string} value
     * @param {number} [precision]        Optional number of significant figures to return.
     */

    function toEngineering(value, precision) {
      // find nearest lower multiple of 3 for exponent
      var e = value.e;
      var newExp = e % 3 === 0 ? e : e < 0 ? e - 3 - e % 3 : e - e % 3; // find difference in exponents, and calculate the value without exponent

      var valueWithoutExp = value.mul(Math.pow(10, -newExp));
      var valueStr = valueWithoutExp.toPrecision(precision);

      if (valueStr.indexOf('e') !== -1) {
        valueStr = valueWithoutExp.toString();
      }

      return valueStr + 'e' + (e >= 0 ? '+' : '') + newExp.toString();
    }
    /**
     * Format a number in exponential notation. Like '1.23e+5', '2.3e+0', '3.500e-3'
     * @param {BigNumber} value
     * @param {number} [precision]  Number of digits in formatted output.
     *                              If not provided, the maximum available digits
     *                              is used.
     * @returns {string} str
     */

    function toExponential(value, precision) {
      if (precision !== undefined) {
        return value.toExponential(precision - 1); // Note the offset of one
      } else {
        return value.toExponential();
      }
    }
    /**
     * Format a number with fixed notation.
     * @param {BigNumber} value
     * @param {number} [precision=undefined] Optional number of decimals after the
     *                                       decimal point. Undefined by default.
     */

    function toFixed(value, precision) {
      return value.toFixed(precision);
    }

    /**
     * Format a value of any type into a string.
     *
     * Usage:
     *     math.format(value)
     *     math.format(value, precision)
     *     math.format(value, options)
     *
     * When value is a function:
     *
     * - When the function has a property `syntax`, it returns this
     *   syntax description.
     * - In other cases, a string `'function'` is returned.
     *
     * When `value` is an Object:
     *
     * - When the object contains a property `format` being a function, this
     *   function is invoked as `value.format(options)` and the result is returned.
     * - When the object has its own `toString` method, this method is invoked
     *   and the result is returned.
     * - In other cases the function will loop over all object properties and
     *   return JSON object notation like '{"a": 2, "b": 3}'.
     *
     * Example usage:
     *     math.format(2/7)                // '0.2857142857142857'
     *     math.format(math.pi, 3)         // '3.14'
     *     math.format(new Complex(2, 3))  // '2 + 3i'
     *     math.format('hello')            // '"hello"'
     *
     * @param {*} value             Value to be stringified
     * @param {Object | number | Function} [options]
     *     Formatting options. See src/utils/number.js:format for a
     *     description of the available options controlling number output.
     *     This generic "format" also supports the option property `truncate: NN`
     *     giving the maximum number NN of characters to return (if there would
     *     have been more, they are deleted and replaced by an ellipsis).
     * @return {string} str
     */

    function format(value, options) {
      var result = _format(value, options);

      if (options && typeof options === 'object' && 'truncate' in options && result.length > options.truncate) {
        return result.substring(0, options.truncate - 3) + '...';
      }

      return result;
    }

    function _format(value, options) {
      if (typeof value === 'number') {
        return format$2(value, options);
      }

      if (isBigNumber(value)) {
        return format$1(value, options);
      } // note: we use unsafe duck-typing here to check for Fractions, this is
      // ok here since we're only invoking toString or concatenating its values


      if (looksLikeFraction(value)) {
        if (!options || options.fraction !== 'decimal') {
          // output as ratio, like '1/3'
          return value.s * value.n + '/' + value.d;
        } else {
          // output as decimal, like '0.(3)'
          return value.toString();
        }
      }

      if (Array.isArray(value)) {
        return formatArray(value, options);
      }

      if (isString(value)) {
        return '"' + value + '"';
      }

      if (typeof value === 'function') {
        return value.syntax ? String(value.syntax) : 'function';
      }

      if (value && typeof value === 'object') {
        if (typeof value.format === 'function') {
          return value.format(options);
        } else if (value && value.toString(options) !== {}.toString()) {
          // this object has a non-native toString method, use that one
          return value.toString(options);
        } else {
          var entries = Object.keys(value).map(key => {
            return '"' + key + '": ' + format(value[key], options);
          });
          return '{' + entries.join(', ') + '}';
        }
      }

      return String(value);
    }
    /**
     * Recursively format an n-dimensional matrix
     * Example output: "[[1, 2], [3, 4]]"
     * @param {Array} array
     * @param {Object | number | Function} [options]  Formatting options. See
     *                                                lib/utils/number:format for a
     *                                                description of the available
     *                                                options.
     * @returns {string} str
     */

    function formatArray(array, options) {
      if (Array.isArray(array)) {
        var str = '[';
        var len = array.length;

        for (var i = 0; i < len; i++) {
          if (i !== 0) {
            str += ', ';
          }

          str += formatArray(array[i], options);
        }

        str += ']';
        return str;
      } else {
        return format(array, options);
      }
    }
    /**
     * Check whether a value looks like a Fraction (unsafe duck-type check)
     * @param {*} value
     * @return {boolean}
     */


    function looksLikeFraction(value) {
      return value && typeof value === 'object' && typeof value.s === 'number' && typeof value.n === 'number' && typeof value.d === 'number' || false;
    }

    /**
     * Create a range error with the message:
     *     'Dimension mismatch (<actual size> != <expected size>)'
     * @param {number | number[]} actual        The actual size
     * @param {number | number[]} expected      The expected size
     * @param {string} [relation='!=']          Optional relation between actual
     *                                          and expected size: '!=', '<', etc.
     * @extends RangeError
     */
    function DimensionError(actual, expected, relation) {
      if (!(this instanceof DimensionError)) {
        throw new SyntaxError('Constructor must be called with the new operator');
      }

      this.actual = actual;
      this.expected = expected;
      this.relation = relation;
      this.message = 'Dimension mismatch (' + (Array.isArray(actual) ? '[' + actual.join(', ') + ']' : actual) + ' ' + (this.relation || '!=') + ' ' + (Array.isArray(expected) ? '[' + expected.join(', ') + ']' : expected) + ')';
      this.stack = new Error().stack;
    }
    DimensionError.prototype = new RangeError();
    DimensionError.prototype.constructor = RangeError;
    DimensionError.prototype.name = 'DimensionError';
    DimensionError.prototype.isDimensionError = true;

    /**
     * Create a range error with the message:
     *     'Index out of range (index < min)'
     *     'Index out of range (index < max)'
     *
     * @param {number} index     The actual index
     * @param {number} [min=0]   Minimum index (included)
     * @param {number} [max]     Maximum index (excluded)
     * @extends RangeError
     */
    function IndexError(index, min, max) {
      if (!(this instanceof IndexError)) {
        throw new SyntaxError('Constructor must be called with the new operator');
      }

      this.index = index;

      if (arguments.length < 3) {
        this.min = 0;
        this.max = min;
      } else {
        this.min = min;
        this.max = max;
      }

      if (this.min !== undefined && this.index < this.min) {
        this.message = 'Index out of range (' + this.index + ' < ' + this.min + ')';
      } else if (this.max !== undefined && this.index >= this.max) {
        this.message = 'Index out of range (' + this.index + ' > ' + (this.max - 1) + ')';
      } else {
        this.message = 'Index out of range (' + this.index + ')';
      }

      this.stack = new Error().stack;
    }
    IndexError.prototype = new RangeError();
    IndexError.prototype.constructor = RangeError;
    IndexError.prototype.name = 'IndexError';
    IndexError.prototype.isIndexError = true;

    /**
     * Calculate the size of a multi dimensional array.
     * This function checks the size of the first entry, it does not validate
     * whether all dimensions match. (use function `validate` for that)
     * @param {Array} x
     * @Return {Number[]} size
     */

    function arraySize(x) {
      var s = [];

      while (Array.isArray(x)) {
        s.push(x.length);
        x = x[0];
      }

      return s;
    }
    /**
     * Recursively validate whether each element in a multi dimensional array
     * has a size corresponding to the provided size array.
     * @param {Array} array    Array to be validated
     * @param {number[]} size  Array with the size of each dimension
     * @param {number} dim   Current dimension
     * @throws DimensionError
     * @private
     */

    function _validate(array, size, dim) {
      var i;
      var len = array.length;

      if (len !== size[dim]) {
        throw new DimensionError(len, size[dim]);
      }

      if (dim < size.length - 1) {
        // recursively validate each child array
        var dimNext = dim + 1;

        for (i = 0; i < len; i++) {
          var child = array[i];

          if (!Array.isArray(child)) {
            throw new DimensionError(size.length - 1, size.length, '<');
          }

          _validate(array[i], size, dimNext);
        }
      } else {
        // last dimension. none of the childs may be an array
        for (i = 0; i < len; i++) {
          if (Array.isArray(array[i])) {
            throw new DimensionError(size.length + 1, size.length, '>');
          }
        }
      }
    }
    /**
     * Validate whether each element in a multi dimensional array has
     * a size corresponding to the provided size array.
     * @param {Array} array    Array to be validated
     * @param {number[]} size  Array with the size of each dimension
     * @throws DimensionError
     */


    function validate(array, size) {
      var isScalar = size.length === 0;

      if (isScalar) {
        // scalar
        if (Array.isArray(array)) {
          throw new DimensionError(array.length, 0);
        }
      } else {
        // array
        _validate(array, size, 0);
      }
    }
    /**
     * Test whether index is an integer number with index >= 0 and index < length
     * when length is provided
     * @param {number} index    Zero-based index
     * @param {number} [length] Length of the array
     */

    function validateIndex(index, length) {
      if (!isNumber(index) || !isInteger(index)) {
        throw new TypeError('Index must be an integer (value: ' + index + ')');
      }

      if (index < 0 || typeof length === 'number' && index >= length) {
        throw new IndexError(index, length);
      }
    }
    /**
     * Resize a multi dimensional array. The resized array is returned.
     * @param {Array} array         Array to be resized
     * @param {Array.<number>} size Array with the size of each dimension
     * @param {*} [defaultValue=0]  Value to be filled in in new entries,
     *                              zero by default. Specify for example `null`,
     *                              to clearly see entries that are not explicitly
     *                              set.
     * @return {Array} array         The resized array
     */

    function resize(array, size, defaultValue) {
      // TODO: add support for scalars, having size=[] ?
      // check the type of the arguments
      if (!Array.isArray(array) || !Array.isArray(size)) {
        throw new TypeError('Array expected');
      }

      if (size.length === 0) {
        throw new Error('Resizing to scalar is not supported');
      } // check whether size contains positive integers


      size.forEach(function (value) {
        if (!isNumber(value) || !isInteger(value) || value < 0) {
          throw new TypeError('Invalid size, must contain positive integers ' + '(size: ' + format(size) + ')');
        }
      }); // recursively resize the array

      var _defaultValue = defaultValue !== undefined ? defaultValue : 0;

      _resize(array, size, 0, _defaultValue);

      return array;
    }
    /**
     * Recursively resize a multi dimensional array
     * @param {Array} array         Array to be resized
     * @param {number[]} size       Array with the size of each dimension
     * @param {number} dim          Current dimension
     * @param {*} [defaultValue]    Value to be filled in in new entries,
     *                              undefined by default.
     * @private
     */

    function _resize(array, size, dim, defaultValue) {
      var i;
      var elem;
      var oldLen = array.length;
      var newLen = size[dim];
      var minLen = Math.min(oldLen, newLen); // apply new length

      array.length = newLen;

      if (dim < size.length - 1) {
        // non-last dimension
        var dimNext = dim + 1; // resize existing child arrays

        for (i = 0; i < minLen; i++) {
          // resize child array
          elem = array[i];

          if (!Array.isArray(elem)) {
            elem = [elem]; // add a dimension

            array[i] = elem;
          }

          _resize(elem, size, dimNext, defaultValue);
        } // create new child arrays


        for (i = minLen; i < newLen; i++) {
          // get child array
          elem = [];
          array[i] = elem; // resize new child array

          _resize(elem, size, dimNext, defaultValue);
        }
      } else {
        // last dimension
        // remove dimensions of existing values
        for (i = 0; i < minLen; i++) {
          while (Array.isArray(array[i])) {
            array[i] = array[i][0];
          }
        } // fill new elements with the default value


        for (i = minLen; i < newLen; i++) {
          array[i] = defaultValue;
        }
      }
    }
    /**
     * Re-shape a multi dimensional array to fit the specified dimensions
     * @param {Array} array           Array to be reshaped
     * @param {Array.<number>} sizes  List of sizes for each dimension
     * @returns {Array}               Array whose data has been formatted to fit the
     *                                specified dimensions
     *
     * @throws {DimensionError}       If the product of the new dimension sizes does
     *                                not equal that of the old ones
     */


    function reshape(array, sizes) {
      var flatArray = flatten(array);
      var currentLength = flatArray.length;

      if (!Array.isArray(array) || !Array.isArray(sizes)) {
        throw new TypeError('Array expected');
      }

      if (sizes.length === 0) {
        throw new DimensionError(0, currentLength, '!=');
      }

      sizes = processSizesWildcard(sizes, currentLength);
      var newLength = product(sizes);

      if (currentLength !== newLength) {
        throw new DimensionError(newLength, currentLength, '!=');
      }

      try {
        return _reshape(flatArray, sizes);
      } catch (e) {
        if (e instanceof DimensionError) {
          throw new DimensionError(newLength, currentLength, '!=');
        }

        throw e;
      }
    }
    /**
     * Replaces the wildcard -1 in the sizes array.
     * @param {Array.<number>} sizes  List of sizes for each dimension. At most on wildcard.
     * @param {number} currentLength  Number of elements in the array.
     * @throws {Error}                If more than one wildcard or unable to replace it.
     * @returns {Array.<number>}      The sizes array with wildcard replaced.
     */

    function processSizesWildcard(sizes, currentLength) {
      var newLength = product(sizes);
      var processedSizes = sizes.slice();
      var WILDCARD = -1;
      var wildCardIndex = sizes.indexOf(WILDCARD);
      var isMoreThanOneWildcard = sizes.indexOf(WILDCARD, wildCardIndex + 1) >= 0;

      if (isMoreThanOneWildcard) {
        throw new Error('More than one wildcard in sizes');
      }

      var hasWildcard = wildCardIndex >= 0;
      var canReplaceWildcard = currentLength % newLength === 0;

      if (hasWildcard) {
        if (canReplaceWildcard) {
          processedSizes[wildCardIndex] = -currentLength / newLength;
        } else {
          throw new Error('Could not replace wildcard, since ' + currentLength + ' is no multiple of ' + -newLength);
        }
      }

      return processedSizes;
    }
    /**
     * Computes the product of all array elements.
     * @param {Array<number>} array Array of factors
     * @returns {number}            Product of all elements
     */

    function product(array) {
      return array.reduce((prev, curr) => prev * curr, 1);
    }
    /**
     * Iteratively re-shape a multi dimensional array to fit the specified dimensions
     * @param {Array} array           Array to be reshaped
     * @param {Array.<number>} sizes  List of sizes for each dimension
     * @returns {Array}               Array whose data has been formatted to fit the
     *                                specified dimensions
     */


    function _reshape(array, sizes) {
      // testing if there are enough elements for the requested shape
      var tmpArray = array;
      var tmpArray2; // for each dimensions starting by the last one and ignoring the first one

      for (var sizeIndex = sizes.length - 1; sizeIndex > 0; sizeIndex--) {
        var size = sizes[sizeIndex];
        tmpArray2 = []; // aggregate the elements of the current tmpArray in elements of the requested size

        var length = tmpArray.length / size;

        for (var i = 0; i < length; i++) {
          tmpArray2.push(tmpArray.slice(i * size, (i + 1) * size));
        } // set it as the new tmpArray for the next loop turn or for return


        tmpArray = tmpArray2;
      }

      return tmpArray;
    }
    /**
     * Unsqueeze a multi dimensional array: add dimensions when missing
     *
     * Paramter `size` will be mutated to match the new, unqueezed matrix size.
     *
     * @param {Array} array
     * @param {number} dims       Desired number of dimensions of the array
     * @param {number} [outer]    Number of outer dimensions to be added
     * @param {Array} [size] Current size of array.
     * @returns {Array} returns the array itself
     * @private
     */


    function unsqueeze(array, dims, outer, size) {
      var s = size || arraySize(array); // unsqueeze outer dimensions

      if (outer) {
        for (var i = 0; i < outer; i++) {
          array = [array];
          s.unshift(1);
        }
      } // unsqueeze inner dimensions


      array = _unsqueeze(array, dims, 0);

      while (s.length < dims) {
        s.push(1);
      }

      return array;
    }
    /**
     * Recursively unsqueeze a multi dimensional array
     * @param {Array} array
     * @param {number} dims Required number of dimensions
     * @param {number} dim  Current dimension
     * @returns {Array | *} Returns the squeezed array
     * @private
     */

    function _unsqueeze(array, dims, dim) {
      var i, ii;

      if (Array.isArray(array)) {
        var next = dim + 1;

        for (i = 0, ii = array.length; i < ii; i++) {
          array[i] = _unsqueeze(array[i], dims, next);
        }
      } else {
        for (var d = dim; d < dims; d++) {
          array = [array];
        }
      }

      return array;
    }
    /**
     * Flatten a multi dimensional array, put all elements in a one dimensional
     * array
     * @param {Array} array   A multi dimensional array
     * @return {Array}        The flattened array (1 dimensional)
     */


    function flatten(array) {
      if (!Array.isArray(array)) {
        // if not an array, return as is
        return array;
      }

      var flat = [];
      array.forEach(function callback(value) {
        if (Array.isArray(value)) {
          value.forEach(callback); // traverse through sub-arrays recursively
        } else {
          flat.push(value);
        }
      });
      return flat;
    }
    /**
     * Check the datatype of a given object
     * This is a low level implementation that should only be used by
     * parent Matrix classes such as SparseMatrix or DenseMatrix
     * This method does not validate Array Matrix shape
     * @param {Array} array
     * @param {function} typeOf   Callback function to use to determine the type of a value
     * @return {string}
     */

    function getArrayDataType(array, typeOf) {
      var type; // to hold type info

      var length = 0; // to hold length value to ensure it has consistent sizes

      for (var i = 0; i < array.length; i++) {
        var item = array[i];
        var isArray = Array.isArray(item); // Saving the target matrix row size

        if (i === 0 && isArray) {
          length = item.length;
        } // If the current item is an array but the length does not equal the targetVectorSize


        if (isArray && item.length !== length) {
          return undefined;
        }

        var itemType = isArray ? getArrayDataType(item, typeOf) // recurse into a nested array
        : typeOf(item);

        if (type === undefined) {
          type = itemType; // first item
        } else if (type !== itemType) {
          return 'mixed';
        } else ;
      }

      return type;
    }

    /**
     * Create a factory function, which can be used to inject dependencies.
     *
     * The created functions are memoized, a consecutive call of the factory
     * with the exact same inputs will return the same function instance.
     * The memoized cache is exposed on `factory.cache` and can be cleared
     * if needed.
     *
     * Example:
     *
     *     const name = 'log'
     *     const dependencies = ['config', 'typed', 'divideScalar', 'Complex']
     *
     *     export const createLog = factory(name, dependencies, ({ typed, config, divideScalar, Complex }) => {
     *       // ... create the function log here and return it
     *     }
     *
     * @param {string} name           Name of the function to be created
     * @param {string[]} dependencies The names of all required dependencies
     * @param {function} create       Callback function called with an object with all dependencies
     * @param {Object} [meta]         Optional object with meta information that will be attached
     *                                to the created factory function as property `meta`.
     * @returns {function}
     */

    function factory(name, dependencies, create, meta) {
      function assertAndCreate(scope) {
        // we only pass the requested dependencies to the factory function
        // to prevent functions to rely on dependencies that are not explicitly
        // requested.
        var deps = pickShallow(scope, dependencies.map(stripOptionalNotation));
        assertDependencies(name, dependencies, scope);
        return create(deps);
      }

      assertAndCreate.isFactory = true;
      assertAndCreate.fn = name;
      assertAndCreate.dependencies = dependencies.slice().sort();

      if (meta) {
        assertAndCreate.meta = meta;
      }

      return assertAndCreate;
    }
    /**
     * Assert that all dependencies of a list with dependencies are available in the provided scope.
     *
     * Will throw an exception when there are dependencies missing.
     *
     * @param {string} name   Name for the function to be created. Used to generate a useful error message
     * @param {string[]} dependencies
     * @param {Object} scope
     */

    function assertDependencies(name, dependencies, scope) {
      var allDefined = dependencies.filter(dependency => !isOptionalDependency(dependency)) // filter optionals
      .every(dependency => scope[dependency] !== undefined);

      if (!allDefined) {
        var missingDependencies = dependencies.filter(dependency => scope[dependency] === undefined); // TODO: create a custom error class for this, a MathjsError or something like that

        throw new Error("Cannot create function \"".concat(name, "\", ") + "some dependencies are missing: ".concat(missingDependencies.map(d => "\"".concat(d, "\"")).join(', '), "."));
      }
    }
    function isOptionalDependency(dependency) {
      return dependency && dependency[0] === '?';
    }
    function stripOptionalNotation(dependency) {
      return dependency && dependency[0] === '?' ? dependency.slice(1) : dependency;
    }

    /**
     * Get a property of a plain object
     * Throws an error in case the object is not a plain object or the
     * property is not defined on the object itself
     * @param {Object} object
     * @param {string} prop
     * @return {*} Returns the property value when safe
     */

    function getSafeProperty(object, prop) {
      // only allow getting safe properties of a plain object
      if (isPlainObject(object) && isSafeProperty(object, prop)) {
        return object[prop];
      }

      if (typeof object[prop] === 'function' && isSafeMethod(object, prop)) {
        throw new Error('Cannot access method "' + prop + '" as a property');
      }

      throw new Error('No access to property "' + prop + '"');
    }
    /**
     * Set a property on a plain object.
     * Throws an error in case the object is not a plain object or the
     * property would override an inherited property like .constructor or .toString
     * @param {Object} object
     * @param {string} prop
     * @param {*} value
     * @return {*} Returns the value
     */
    // TODO: merge this function into access.js?


    function setSafeProperty(object, prop, value) {
      // only allow setting safe properties of a plain object
      if (isPlainObject(object) && isSafeProperty(object, prop)) {
        object[prop] = value;
        return value;
      }

      throw new Error('No access to property "' + prop + '"');
    }

    function hasSafeProperty(object, prop) {
      return prop in object;
    }
    /**
     * Test whether a property is safe to use for an object.
     * For example .toString and .constructor are not safe
     * @param {string} prop
     * @return {boolean} Returns true when safe
     */


    function isSafeProperty(object, prop) {
      if (!object || typeof object !== 'object') {
        return false;
      } // SAFE: whitelisted
      // e.g length


      if (hasOwnProperty(safeNativeProperties, prop)) {
        return true;
      } // UNSAFE: inherited from Object prototype
      // e.g constructor


      if (prop in Object.prototype) {
        // 'in' is used instead of hasOwnProperty for nodejs v0.10
        // which is inconsistent on root prototypes. It is safe
        // here because Object.prototype is a root object
        return false;
      } // UNSAFE: inherited from Function prototype
      // e.g call, apply


      if (prop in Function.prototype) {
        // 'in' is used instead of hasOwnProperty for nodejs v0.10
        // which is inconsistent on root prototypes. It is safe
        // here because Function.prototype is a root object
        return false;
      }

      return true;
    }
    /**
     * Check whether a method is safe.
     * Throws an error when that's not the case (for example for `constructor`).
     * @param {Object} object
     * @param {string} method
     * @return {boolean} Returns true when safe, false otherwise
     */


    function isSafeMethod(object, method) {
      if (object === null || object === undefined || typeof object[method] !== 'function') {
        return false;
      } // UNSAFE: ghosted
      // e.g overridden toString
      // Note that IE10 doesn't support __proto__ and we can't do this check there.


      if (hasOwnProperty(object, method) && Object.getPrototypeOf && method in Object.getPrototypeOf(object)) {
        return false;
      } // SAFE: whitelisted
      // e.g toString


      if (hasOwnProperty(safeNativeMethods, method)) {
        return true;
      } // UNSAFE: inherited from Object prototype
      // e.g constructor


      if (method in Object.prototype) {
        // 'in' is used instead of hasOwnProperty for nodejs v0.10
        // which is inconsistent on root prototypes. It is safe
        // here because Object.prototype is a root object
        return false;
      } // UNSAFE: inherited from Function prototype
      // e.g call, apply


      if (method in Function.prototype) {
        // 'in' is used instead of hasOwnProperty for nodejs v0.10
        // which is inconsistent on root prototypes. It is safe
        // here because Function.prototype is a root object
        return false;
      }

      return true;
    }

    function isPlainObject(object) {
      return typeof object === 'object' && object && object.constructor === Object;
    }

    var safeNativeProperties = {
      length: true,
      name: true
    };
    var safeNativeMethods = {
      toString: true,
      valueOf: true,
      toLocaleString: true
    };

    /**
     * A map facade on a bare object.
     *
     * The small number of methods needed to implement a scope,
     * forwarding on to the SafeProperty functions. Over time, the codebase
     * will stop using this method, as all objects will be Maps, rather than
     * more security prone objects.
     */

    class ObjectWrappingMap {
      constructor(object) {
        this.wrappedObject = object;
      }

      keys() {
        return Object.keys(this.wrappedObject);
      }

      get(key) {
        return getSafeProperty(this.wrappedObject, key);
      }

      set(key, value) {
        setSafeProperty(this.wrappedObject, key, value);
        return this;
      }

      has(key) {
        return hasSafeProperty(this.wrappedObject, key);
      }

    }
    /**
     * Returns `true` if the passed object appears to be a Map (i.e. duck typing).
     *
     * Methods looked for are `get`, `set`, `keys` and `has`.
     *
     * @param {Map | object} object
     * @returns
     */

    function isMap(object) {
      // We can use the fast instanceof, or a slower duck typing check.
      // The duck typing method needs to cover enough methods to not be confused with DenseMatrix.
      if (!object) {
        return false;
      }

      return object instanceof Map || object instanceof ObjectWrappingMap || typeof object.set === 'function' && typeof object.get === 'function' && typeof object.keys === 'function' && typeof object.has === 'function';
    }

    /**
     * Create a typed-function which checks the types of the arguments and
     * can match them against multiple provided signatures. The typed-function
     * automatically converts inputs in order to find a matching signature.
     * Typed functions throw informative errors in case of wrong input arguments.
     *
     * See the library [typed-function](https://github.com/josdejong/typed-function)
     * for detailed documentation.
     *
     * Syntax:
     *
     *     math.typed(name, signatures) : function
     *     math.typed(signatures) : function
     *
     * Examples:
     *
     *     // create a typed function with multiple types per argument (type union)
     *     const fn2 = typed({
     *       'number | boolean': function (b) {
     *         return 'b is a number or boolean'
     *       },
     *       'string, number | boolean': function (a, b) {
     *         return 'a is a string, b is a number or boolean'
     *       }
     *     })
     *
     *     // create a typed function with an any type argument
     *     const log = typed({
     *       'string, any': function (event, data) {
     *         console.log('event: ' + event + ', data: ' + JSON.stringify(data))
     *       }
     *     })
     *
     * @param {string} [name]                          Optional name for the typed-function
     * @param {Object<string, function>} signatures   Object with one or multiple function signatures
     * @returns {function} The created typed-function.
     */

    var _createTyped2 = function _createTyped() {
      // initially, return the original instance of typed-function
      // consecutively, return a new instance from typed.create.
      _createTyped2 = typedFunction.create;
      return typedFunction;
    };

    var dependencies$h = ['?BigNumber', '?Complex', '?DenseMatrix', '?Fraction'];
    /**
     * Factory function for creating a new typed instance
     * @param {Object} dependencies   Object with data types like Complex and BigNumber
     * @returns {Function}
     */

    var createTyped = /* #__PURE__ */factory('typed', dependencies$h, function createTyped(_ref) {
      var {
        BigNumber,
        Complex,
        DenseMatrix,
        Fraction
      } = _ref;

      // TODO: typed-function must be able to silently ignore signatures with unknown data types
      // get a new instance of typed-function
      var typed = _createTyped2(); // define all types. The order of the types determines in which order function
      // arguments are type-checked (so for performance it's important to put the
      // most used types first).


      typed.types = [{
        name: 'number',
        test: isNumber
      }, {
        name: 'Complex',
        test: isComplex
      }, {
        name: 'BigNumber',
        test: isBigNumber
      }, {
        name: 'Fraction',
        test: isFraction
      }, {
        name: 'Unit',
        test: isUnit
      }, {
        name: 'string',
        test: isString
      }, {
        name: 'Chain',
        test: isChain
      }, {
        name: 'Array',
        test: isArray
      }, {
        name: 'Matrix',
        test: isMatrix
      }, {
        name: 'DenseMatrix',
        test: isDenseMatrix
      }, {
        name: 'SparseMatrix',
        test: isSparseMatrix
      }, {
        name: 'Range',
        test: isRange
      }, {
        name: 'Index',
        test: isIndex
      }, {
        name: 'boolean',
        test: isBoolean
      }, {
        name: 'ResultSet',
        test: isResultSet
      }, {
        name: 'Help',
        test: isHelp
      }, {
        name: 'function',
        test: isFunction
      }, {
        name: 'Date',
        test: isDate
      }, {
        name: 'RegExp',
        test: isRegExp
      }, {
        name: 'null',
        test: isNull
      }, {
        name: 'undefined',
        test: isUndefined
      }, {
        name: 'AccessorNode',
        test: isAccessorNode
      }, {
        name: 'ArrayNode',
        test: isArrayNode
      }, {
        name: 'AssignmentNode',
        test: isAssignmentNode
      }, {
        name: 'BlockNode',
        test: isBlockNode
      }, {
        name: 'ConditionalNode',
        test: isConditionalNode
      }, {
        name: 'ConstantNode',
        test: isConstantNode
      }, {
        name: 'FunctionNode',
        test: isFunctionNode
      }, {
        name: 'FunctionAssignmentNode',
        test: isFunctionAssignmentNode
      }, {
        name: 'IndexNode',
        test: isIndexNode
      }, {
        name: 'Node',
        test: isNode
      }, {
        name: 'ObjectNode',
        test: isObjectNode
      }, {
        name: 'OperatorNode',
        test: isOperatorNode
      }, {
        name: 'ParenthesisNode',
        test: isParenthesisNode
      }, {
        name: 'RangeNode',
        test: isRangeNode
      }, {
        name: 'SymbolNode',
        test: isSymbolNode
      }, {
        name: 'Map',
        test: isMap
      }, {
        name: 'Object',
        test: isObject
      } // order 'Object' last, it matches on other classes too
      ];
      typed.conversions = [{
        from: 'number',
        to: 'BigNumber',
        convert: function convert(x) {
          if (!BigNumber) {
            throwNoBignumber(x);
          } // note: conversion from number to BigNumber can fail if x has >15 digits


          if (digits(x) > 15) {
            throw new TypeError('Cannot implicitly convert a number with >15 significant digits to BigNumber ' + '(value: ' + x + '). ' + 'Use function bignumber(x) to convert to BigNumber.');
          }

          return new BigNumber(x);
        }
      }, {
        from: 'number',
        to: 'Complex',
        convert: function convert(x) {
          if (!Complex) {
            throwNoComplex(x);
          }

          return new Complex(x, 0);
        }
      }, {
        from: 'number',
        to: 'string',
        convert: function convert(x) {
          return x + '';
        }
      }, {
        from: 'BigNumber',
        to: 'Complex',
        convert: function convert(x) {
          if (!Complex) {
            throwNoComplex(x);
          }

          return new Complex(x.toNumber(), 0);
        }
      }, {
        from: 'Fraction',
        to: 'BigNumber',
        convert: function convert(x) {
          throw new TypeError('Cannot implicitly convert a Fraction to BigNumber or vice versa. ' + 'Use function bignumber(x) to convert to BigNumber or fraction(x) to convert to Fraction.');
        }
      }, {
        from: 'Fraction',
        to: 'Complex',
        convert: function convert(x) {
          if (!Complex) {
            throwNoComplex(x);
          }

          return new Complex(x.valueOf(), 0);
        }
      }, {
        from: 'number',
        to: 'Fraction',
        convert: function convert(x) {
          if (!Fraction) {
            throwNoFraction(x);
          }

          var f = new Fraction(x);

          if (f.valueOf() !== x) {
            throw new TypeError('Cannot implicitly convert a number to a Fraction when there will be a loss of precision ' + '(value: ' + x + '). ' + 'Use function fraction(x) to convert to Fraction.');
          }

          return f;
        }
      }, {
        // FIXME: add conversion from Fraction to number, for example for `sqrt(fraction(1,3))`
        //  from: 'Fraction',
        //  to: 'number',
        //  convert: function (x) {
        //    return x.valueOf()
        //  }
        // }, {
        from: 'string',
        to: 'number',
        convert: function convert(x) {
          var n = Number(x);

          if (isNaN(n)) {
            throw new Error('Cannot convert "' + x + '" to a number');
          }

          return n;
        }
      }, {
        from: 'string',
        to: 'BigNumber',
        convert: function convert(x) {
          if (!BigNumber) {
            throwNoBignumber(x);
          }

          try {
            return new BigNumber(x);
          } catch (err) {
            throw new Error('Cannot convert "' + x + '" to BigNumber');
          }
        }
      }, {
        from: 'string',
        to: 'Fraction',
        convert: function convert(x) {
          if (!Fraction) {
            throwNoFraction(x);
          }

          try {
            return new Fraction(x);
          } catch (err) {
            throw new Error('Cannot convert "' + x + '" to Fraction');
          }
        }
      }, {
        from: 'string',
        to: 'Complex',
        convert: function convert(x) {
          if (!Complex) {
            throwNoComplex(x);
          }

          try {
            return new Complex(x);
          } catch (err) {
            throw new Error('Cannot convert "' + x + '" to Complex');
          }
        }
      }, {
        from: 'boolean',
        to: 'number',
        convert: function convert(x) {
          return +x;
        }
      }, {
        from: 'boolean',
        to: 'BigNumber',
        convert: function convert(x) {
          if (!BigNumber) {
            throwNoBignumber(x);
          }

          return new BigNumber(+x);
        }
      }, {
        from: 'boolean',
        to: 'Fraction',
        convert: function convert(x) {
          if (!Fraction) {
            throwNoFraction(x);
          }

          return new Fraction(+x);
        }
      }, {
        from: 'boolean',
        to: 'string',
        convert: function convert(x) {
          return String(x);
        }
      }, {
        from: 'Array',
        to: 'Matrix',
        convert: function convert(array) {
          if (!DenseMatrix) {
            throwNoMatrix();
          }

          return new DenseMatrix(array);
        }
      }, {
        from: 'Matrix',
        to: 'Array',
        convert: function convert(matrix) {
          return matrix.valueOf();
        }
      }];
      return typed;
    });

    function throwNoBignumber(x) {
      throw new Error("Cannot convert value ".concat(x, " into a BigNumber: no class 'BigNumber' provided"));
    }

    function throwNoComplex(x) {
      throw new Error("Cannot convert value ".concat(x, " into a Complex number: no class 'Complex' provided"));
    }

    function throwNoMatrix() {
      throw new Error('Cannot convert array into a Matrix: no class \'DenseMatrix\' provided');
    }

    function throwNoFraction(x) {
      throw new Error("Cannot convert value ".concat(x, " into a Fraction, no class 'Fraction' provided."));
    }

    var decimal = createCommonjsModule(function (module) {
    (function (globalScope) {


      /*
       *  decimal.js v10.3.1
       *  An arbitrary-precision Decimal type for JavaScript.
       *  https://github.com/MikeMcl/decimal.js
       *  Copyright (c) 2021 Michael Mclaughlin <M8ch88l@gmail.com>
       *  MIT Licence
       */


      // -----------------------------------  EDITABLE DEFAULTS  ------------------------------------ //


        // The maximum exponent magnitude.
        // The limit on the value of `toExpNeg`, `toExpPos`, `minE` and `maxE`.
      var EXP_LIMIT = 9e15,                      // 0 to 9e15

        // The limit on the value of `precision`, and on the value of the first argument to
        // `toDecimalPlaces`, `toExponential`, `toFixed`, `toPrecision` and `toSignificantDigits`.
        MAX_DIGITS = 1e9,                        // 0 to 1e9

        // Base conversion alphabet.
        NUMERALS = '0123456789abcdef',

        // The natural logarithm of 10 (1025 digits).
        LN10 = '2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053089653777326288461633662222876982198867465436674744042432743651550489343149393914796194044002221051017141748003688084012647080685567743216228355220114804663715659121373450747856947683463616792101806445070648000277502684916746550586856935673420670581136429224554405758925724208241314695689016758940256776311356919292033376587141660230105703089634572075440370847469940168269282808481184289314848524948644871927809676271275775397027668605952496716674183485704422507197965004714951050492214776567636938662976979522110718264549734772662425709429322582798502585509785265383207606726317164309505995087807523710333101197857547331541421808427543863591778117054309827482385045648019095610299291824318237525357709750539565187697510374970888692180205189339507238539205144634197265287286965110862571492198849978748873771345686209167058',

        // Pi (1025 digits).
        PI = '3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632789',


        // The initial configuration properties of the Decimal constructor.
        DEFAULTS = {

          // These values must be integers within the stated ranges (inclusive).
          // Most of these values can be changed at run-time using the `Decimal.config` method.

          // The maximum number of significant digits of the result of a calculation or base conversion.
          // E.g. `Decimal.config({ precision: 20 });`
          precision: 20,                         // 1 to MAX_DIGITS

          // The rounding mode used when rounding to `precision`.
          //
          // ROUND_UP         0 Away from zero.
          // ROUND_DOWN       1 Towards zero.
          // ROUND_CEIL       2 Towards +Infinity.
          // ROUND_FLOOR      3 Towards -Infinity.
          // ROUND_HALF_UP    4 Towards nearest neighbour. If equidistant, up.
          // ROUND_HALF_DOWN  5 Towards nearest neighbour. If equidistant, down.
          // ROUND_HALF_EVEN  6 Towards nearest neighbour. If equidistant, towards even neighbour.
          // ROUND_HALF_CEIL  7 Towards nearest neighbour. If equidistant, towards +Infinity.
          // ROUND_HALF_FLOOR 8 Towards nearest neighbour. If equidistant, towards -Infinity.
          //
          // E.g.
          // `Decimal.rounding = 4;`
          // `Decimal.rounding = Decimal.ROUND_HALF_UP;`
          rounding: 4,                           // 0 to 8

          // The modulo mode used when calculating the modulus: a mod n.
          // The quotient (q = a / n) is calculated according to the corresponding rounding mode.
          // The remainder (r) is calculated as: r = a - n * q.
          //
          // UP         0 The remainder is positive if the dividend is negative, else is negative.
          // DOWN       1 The remainder has the same sign as the dividend (JavaScript %).
          // FLOOR      3 The remainder has the same sign as the divisor (Python %).
          // HALF_EVEN  6 The IEEE 754 remainder function.
          // EUCLID     9 Euclidian division. q = sign(n) * floor(a / abs(n)). Always positive.
          //
          // Truncated division (1), floored division (3), the IEEE 754 remainder (6), and Euclidian
          // division (9) are commonly used for the modulus operation. The other rounding modes can also
          // be used, but they may not give useful results.
          modulo: 1,                             // 0 to 9

          // The exponent value at and beneath which `toString` returns exponential notation.
          // JavaScript numbers: -7
          toExpNeg: -7,                          // 0 to -EXP_LIMIT

          // The exponent value at and above which `toString` returns exponential notation.
          // JavaScript numbers: 21
          toExpPos:  21,                         // 0 to EXP_LIMIT

          // The minimum exponent value, beneath which underflow to zero occurs.
          // JavaScript numbers: -324  (5e-324)
          minE: -EXP_LIMIT,                      // -1 to -EXP_LIMIT

          // The maximum exponent value, above which overflow to Infinity occurs.
          // JavaScript numbers: 308  (1.7976931348623157e+308)
          maxE: EXP_LIMIT,                       // 1 to EXP_LIMIT

          // Whether to use cryptographically-secure random number generation, if available.
          crypto: false                          // true/false
        },


      // ----------------------------------- END OF EDITABLE DEFAULTS ------------------------------- //


        Decimal, inexact, noConflict, quadrant,
        external = true,

        decimalError = '[DecimalError] ',
        invalidArgument = decimalError + 'Invalid argument: ',
        precisionLimitExceeded = decimalError + 'Precision limit exceeded',
        cryptoUnavailable = decimalError + 'crypto unavailable',
        tag = '[object Decimal]',

        mathfloor = Math.floor,
        mathpow = Math.pow,

        isBinary = /^0b([01]+(\.[01]*)?|\.[01]+)(p[+-]?\d+)?$/i,
        isHex = /^0x([0-9a-f]+(\.[0-9a-f]*)?|\.[0-9a-f]+)(p[+-]?\d+)?$/i,
        isOctal = /^0o([0-7]+(\.[0-7]*)?|\.[0-7]+)(p[+-]?\d+)?$/i,
        isDecimal = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i,

        BASE = 1e7,
        LOG_BASE = 7,
        MAX_SAFE_INTEGER = 9007199254740991,

        LN10_PRECISION = LN10.length - 1,
        PI_PRECISION = PI.length - 1,

        // Decimal.prototype object
        P = { toStringTag: tag };


      // Decimal prototype methods


      /*
       *  absoluteValue             abs
       *  ceil
       *  clampedTo                 clamp
       *  comparedTo                cmp
       *  cosine                    cos
       *  cubeRoot                  cbrt
       *  decimalPlaces             dp
       *  dividedBy                 div
       *  dividedToIntegerBy        divToInt
       *  equals                    eq
       *  floor
       *  greaterThan               gt
       *  greaterThanOrEqualTo      gte
       *  hyperbolicCosine          cosh
       *  hyperbolicSine            sinh
       *  hyperbolicTangent         tanh
       *  inverseCosine             acos
       *  inverseHyperbolicCosine   acosh
       *  inverseHyperbolicSine     asinh
       *  inverseHyperbolicTangent  atanh
       *  inverseSine               asin
       *  inverseTangent            atan
       *  isFinite
       *  isInteger                 isInt
       *  isNaN
       *  isNegative                isNeg
       *  isPositive                isPos
       *  isZero
       *  lessThan                  lt
       *  lessThanOrEqualTo         lte
       *  logarithm                 log
       *  [maximum]                 [max]
       *  [minimum]                 [min]
       *  minus                     sub
       *  modulo                    mod
       *  naturalExponential        exp
       *  naturalLogarithm          ln
       *  negated                   neg
       *  plus                      add
       *  precision                 sd
       *  round
       *  sine                      sin
       *  squareRoot                sqrt
       *  tangent                   tan
       *  times                     mul
       *  toBinary
       *  toDecimalPlaces           toDP
       *  toExponential
       *  toFixed
       *  toFraction
       *  toHexadecimal             toHex
       *  toNearest
       *  toNumber
       *  toOctal
       *  toPower                   pow
       *  toPrecision
       *  toSignificantDigits       toSD
       *  toString
       *  truncated                 trunc
       *  valueOf                   toJSON
       */


      /*
       * Return a new Decimal whose value is the absolute value of this Decimal.
       *
       */
      P.absoluteValue = P.abs = function () {
        var x = new this.constructor(this);
        if (x.s < 0) x.s = 1;
        return finalise(x);
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal rounded to a whole number in the
       * direction of positive Infinity.
       *
       */
      P.ceil = function () {
        return finalise(new this.constructor(this), this.e + 1, 2);
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal clamped to the range
       * delineated by `min` and `max`.
       *
       * min {number|string|Decimal}
       * max {number|string|Decimal}
       *
       */
      P.clampedTo = P.clamp = function (min, max) {
        var k,
          x = this,
          Ctor = x.constructor;
        min = new Ctor(min);
        max = new Ctor(max);
        if (!min.s || !max.s) return new Ctor(NaN);
        if (min.gt(max)) throw Error(invalidArgument + max);
        k = x.cmp(min);
        return k < 0 ? min : x.cmp(max) > 0 ? max : new Ctor(x);
      };


      /*
       * Return
       *   1    if the value of this Decimal is greater than the value of `y`,
       *  -1    if the value of this Decimal is less than the value of `y`,
       *   0    if they have the same value,
       *   NaN  if the value of either Decimal is NaN.
       *
       */
      P.comparedTo = P.cmp = function (y) {
        var i, j, xdL, ydL,
          x = this,
          xd = x.d,
          yd = (y = new x.constructor(y)).d,
          xs = x.s,
          ys = y.s;

        // Either NaN or ±Infinity?
        if (!xd || !yd) {
          return !xs || !ys ? NaN : xs !== ys ? xs : xd === yd ? 0 : !xd ^ xs < 0 ? 1 : -1;
        }

        // Either zero?
        if (!xd[0] || !yd[0]) return xd[0] ? xs : yd[0] ? -ys : 0;

        // Signs differ?
        if (xs !== ys) return xs;

        // Compare exponents.
        if (x.e !== y.e) return x.e > y.e ^ xs < 0 ? 1 : -1;

        xdL = xd.length;
        ydL = yd.length;

        // Compare digit by digit.
        for (i = 0, j = xdL < ydL ? xdL : ydL; i < j; ++i) {
          if (xd[i] !== yd[i]) return xd[i] > yd[i] ^ xs < 0 ? 1 : -1;
        }

        // Compare lengths.
        return xdL === ydL ? 0 : xdL > ydL ^ xs < 0 ? 1 : -1;
      };


      /*
       * Return a new Decimal whose value is the cosine of the value in radians of this Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-1, 1]
       *
       * cos(0)         = 1
       * cos(-0)        = 1
       * cos(Infinity)  = NaN
       * cos(-Infinity) = NaN
       * cos(NaN)       = NaN
       *
       */
      P.cosine = P.cos = function () {
        var pr, rm,
          x = this,
          Ctor = x.constructor;

        if (!x.d) return new Ctor(NaN);

        // cos(0) = cos(-0) = 1
        if (!x.d[0]) return new Ctor(1);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + Math.max(x.e, x.sd()) + LOG_BASE;
        Ctor.rounding = 1;

        x = cosine(Ctor, toLessThanHalfPi(Ctor, x));

        Ctor.precision = pr;
        Ctor.rounding = rm;

        return finalise(quadrant == 2 || quadrant == 3 ? x.neg() : x, pr, rm, true);
      };


      /*
       *
       * Return a new Decimal whose value is the cube root of the value of this Decimal, rounded to
       * `precision` significant digits using rounding mode `rounding`.
       *
       *  cbrt(0)  =  0
       *  cbrt(-0) = -0
       *  cbrt(1)  =  1
       *  cbrt(-1) = -1
       *  cbrt(N)  =  N
       *  cbrt(-I) = -I
       *  cbrt(I)  =  I
       *
       * Math.cbrt(x) = (x < 0 ? -Math.pow(-x, 1/3) : Math.pow(x, 1/3))
       *
       */
      P.cubeRoot = P.cbrt = function () {
        var e, m, n, r, rep, s, sd, t, t3, t3plusx,
          x = this,
          Ctor = x.constructor;

        if (!x.isFinite() || x.isZero()) return new Ctor(x);
        external = false;

        // Initial estimate.
        s = x.s * mathpow(x.s * x, 1 / 3);

         // Math.cbrt underflow/overflow?
         // Pass x to Math.pow as integer, then adjust the exponent of the result.
        if (!s || Math.abs(s) == 1 / 0) {
          n = digitsToString(x.d);
          e = x.e;

          // Adjust n exponent so it is a multiple of 3 away from x exponent.
          if (s = (e - n.length + 1) % 3) n += (s == 1 || s == -2 ? '0' : '00');
          s = mathpow(n, 1 / 3);

          // Rarely, e may be one less than the result exponent value.
          e = mathfloor((e + 1) / 3) - (e % 3 == (e < 0 ? -1 : 2));

          if (s == 1 / 0) {
            n = '5e' + e;
          } else {
            n = s.toExponential();
            n = n.slice(0, n.indexOf('e') + 1) + e;
          }

          r = new Ctor(n);
          r.s = x.s;
        } else {
          r = new Ctor(s.toString());
        }

        sd = (e = Ctor.precision) + 3;

        // Halley's method.
        // TODO? Compare Newton's method.
        for (;;) {
          t = r;
          t3 = t.times(t).times(t);
          t3plusx = t3.plus(x);
          r = divide(t3plusx.plus(x).times(t), t3plusx.plus(t3), sd + 2, 1);

          // TODO? Replace with for-loop and checkRoundingDigits.
          if (digitsToString(t.d).slice(0, sd) === (n = digitsToString(r.d)).slice(0, sd)) {
            n = n.slice(sd - 3, sd + 1);

            // The 4th rounding digit may be in error by -1 so if the 4 rounding digits are 9999 or 4999
            // , i.e. approaching a rounding boundary, continue the iteration.
            if (n == '9999' || !rep && n == '4999') {

              // On the first iteration only, check to see if rounding up gives the exact result as the
              // nines may infinitely repeat.
              if (!rep) {
                finalise(t, e + 1, 0);

                if (t.times(t).times(t).eq(x)) {
                  r = t;
                  break;
                }
              }

              sd += 4;
              rep = 1;
            } else {

              // If the rounding digits are null, 0{0,4} or 50{0,3}, check for an exact result.
              // If not, then there are further digits and m will be truthy.
              if (!+n || !+n.slice(1) && n.charAt(0) == '5') {

                // Truncate to the first rounding digit.
                finalise(r, e + 1, 1);
                m = !r.times(r).times(r).eq(x);
              }

              break;
            }
          }
        }

        external = true;

        return finalise(r, e, Ctor.rounding, m);
      };


      /*
       * Return the number of decimal places of the value of this Decimal.
       *
       */
      P.decimalPlaces = P.dp = function () {
        var w,
          d = this.d,
          n = NaN;

        if (d) {
          w = d.length - 1;
          n = (w - mathfloor(this.e / LOG_BASE)) * LOG_BASE;

          // Subtract the number of trailing zeros of the last word.
          w = d[w];
          if (w) for (; w % 10 == 0; w /= 10) n--;
          if (n < 0) n = 0;
        }

        return n;
      };


      /*
       *  n / 0 = I
       *  n / N = N
       *  n / I = 0
       *  0 / n = 0
       *  0 / 0 = N
       *  0 / N = N
       *  0 / I = 0
       *  N / n = N
       *  N / 0 = N
       *  N / N = N
       *  N / I = N
       *  I / n = I
       *  I / 0 = I
       *  I / N = N
       *  I / I = N
       *
       * Return a new Decimal whose value is the value of this Decimal divided by `y`, rounded to
       * `precision` significant digits using rounding mode `rounding`.
       *
       */
      P.dividedBy = P.div = function (y) {
        return divide(this, new this.constructor(y));
      };


      /*
       * Return a new Decimal whose value is the integer part of dividing the value of this Decimal
       * by the value of `y`, rounded to `precision` significant digits using rounding mode `rounding`.
       *
       */
      P.dividedToIntegerBy = P.divToInt = function (y) {
        var x = this,
          Ctor = x.constructor;
        return finalise(divide(x, new Ctor(y), 0, 1, 1), Ctor.precision, Ctor.rounding);
      };


      /*
       * Return true if the value of this Decimal is equal to the value of `y`, otherwise return false.
       *
       */
      P.equals = P.eq = function (y) {
        return this.cmp(y) === 0;
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal rounded to a whole number in the
       * direction of negative Infinity.
       *
       */
      P.floor = function () {
        return finalise(new this.constructor(this), this.e + 1, 3);
      };


      /*
       * Return true if the value of this Decimal is greater than the value of `y`, otherwise return
       * false.
       *
       */
      P.greaterThan = P.gt = function (y) {
        return this.cmp(y) > 0;
      };


      /*
       * Return true if the value of this Decimal is greater than or equal to the value of `y`,
       * otherwise return false.
       *
       */
      P.greaterThanOrEqualTo = P.gte = function (y) {
        var k = this.cmp(y);
        return k == 1 || k === 0;
      };


      /*
       * Return a new Decimal whose value is the hyperbolic cosine of the value in radians of this
       * Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [1, Infinity]
       *
       * cosh(x) = 1 + x^2/2! + x^4/4! + x^6/6! + ...
       *
       * cosh(0)         = 1
       * cosh(-0)        = 1
       * cosh(Infinity)  = Infinity
       * cosh(-Infinity) = Infinity
       * cosh(NaN)       = NaN
       *
       *  x        time taken (ms)   result
       * 1000      9                 9.8503555700852349694e+433
       * 10000     25                4.4034091128314607936e+4342
       * 100000    171               1.4033316802130615897e+43429
       * 1000000   3817              1.5166076984010437725e+434294
       * 10000000  abandoned after 2 minute wait
       *
       * TODO? Compare performance of cosh(x) = 0.5 * (exp(x) + exp(-x))
       *
       */
      P.hyperbolicCosine = P.cosh = function () {
        var k, n, pr, rm, len,
          x = this,
          Ctor = x.constructor,
          one = new Ctor(1);

        if (!x.isFinite()) return new Ctor(x.s ? 1 / 0 : NaN);
        if (x.isZero()) return one;

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + Math.max(x.e, x.sd()) + 4;
        Ctor.rounding = 1;
        len = x.d.length;

        // Argument reduction: cos(4x) = 1 - 8cos^2(x) + 8cos^4(x) + 1
        // i.e. cos(x) = 1 - cos^2(x/4)(8 - 8cos^2(x/4))

        // Estimate the optimum number of times to use the argument reduction.
        // TODO? Estimation reused from cosine() and may not be optimal here.
        if (len < 32) {
          k = Math.ceil(len / 3);
          n = (1 / tinyPow(4, k)).toString();
        } else {
          k = 16;
          n = '2.3283064365386962890625e-10';
        }

        x = taylorSeries(Ctor, 1, x.times(n), new Ctor(1), true);

        // Reverse argument reduction
        var cosh2_x,
          i = k,
          d8 = new Ctor(8);
        for (; i--;) {
          cosh2_x = x.times(x);
          x = one.minus(cosh2_x.times(d8.minus(cosh2_x.times(d8))));
        }

        return finalise(x, Ctor.precision = pr, Ctor.rounding = rm, true);
      };


      /*
       * Return a new Decimal whose value is the hyperbolic sine of the value in radians of this
       * Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-Infinity, Infinity]
       *
       * sinh(x) = x + x^3/3! + x^5/5! + x^7/7! + ...
       *
       * sinh(0)         = 0
       * sinh(-0)        = -0
       * sinh(Infinity)  = Infinity
       * sinh(-Infinity) = -Infinity
       * sinh(NaN)       = NaN
       *
       * x        time taken (ms)
       * 10       2 ms
       * 100      5 ms
       * 1000     14 ms
       * 10000    82 ms
       * 100000   886 ms            1.4033316802130615897e+43429
       * 200000   2613 ms
       * 300000   5407 ms
       * 400000   8824 ms
       * 500000   13026 ms          8.7080643612718084129e+217146
       * 1000000  48543 ms
       *
       * TODO? Compare performance of sinh(x) = 0.5 * (exp(x) - exp(-x))
       *
       */
      P.hyperbolicSine = P.sinh = function () {
        var k, pr, rm, len,
          x = this,
          Ctor = x.constructor;

        if (!x.isFinite() || x.isZero()) return new Ctor(x);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + Math.max(x.e, x.sd()) + 4;
        Ctor.rounding = 1;
        len = x.d.length;

        if (len < 3) {
          x = taylorSeries(Ctor, 2, x, x, true);
        } else {

          // Alternative argument reduction: sinh(3x) = sinh(x)(3 + 4sinh^2(x))
          // i.e. sinh(x) = sinh(x/3)(3 + 4sinh^2(x/3))
          // 3 multiplications and 1 addition

          // Argument reduction: sinh(5x) = sinh(x)(5 + sinh^2(x)(20 + 16sinh^2(x)))
          // i.e. sinh(x) = sinh(x/5)(5 + sinh^2(x/5)(20 + 16sinh^2(x/5)))
          // 4 multiplications and 2 additions

          // Estimate the optimum number of times to use the argument reduction.
          k = 1.4 * Math.sqrt(len);
          k = k > 16 ? 16 : k | 0;

          x = x.times(1 / tinyPow(5, k));
          x = taylorSeries(Ctor, 2, x, x, true);

          // Reverse argument reduction
          var sinh2_x,
            d5 = new Ctor(5),
            d16 = new Ctor(16),
            d20 = new Ctor(20);
          for (; k--;) {
            sinh2_x = x.times(x);
            x = x.times(d5.plus(sinh2_x.times(d16.times(sinh2_x).plus(d20))));
          }
        }

        Ctor.precision = pr;
        Ctor.rounding = rm;

        return finalise(x, pr, rm, true);
      };


      /*
       * Return a new Decimal whose value is the hyperbolic tangent of the value in radians of this
       * Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-1, 1]
       *
       * tanh(x) = sinh(x) / cosh(x)
       *
       * tanh(0)         = 0
       * tanh(-0)        = -0
       * tanh(Infinity)  = 1
       * tanh(-Infinity) = -1
       * tanh(NaN)       = NaN
       *
       */
      P.hyperbolicTangent = P.tanh = function () {
        var pr, rm,
          x = this,
          Ctor = x.constructor;

        if (!x.isFinite()) return new Ctor(x.s);
        if (x.isZero()) return new Ctor(x);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + 7;
        Ctor.rounding = 1;

        return divide(x.sinh(), x.cosh(), Ctor.precision = pr, Ctor.rounding = rm);
      };


      /*
       * Return a new Decimal whose value is the arccosine (inverse cosine) in radians of the value of
       * this Decimal.
       *
       * Domain: [-1, 1]
       * Range: [0, pi]
       *
       * acos(x) = pi/2 - asin(x)
       *
       * acos(0)       = pi/2
       * acos(-0)      = pi/2
       * acos(1)       = 0
       * acos(-1)      = pi
       * acos(1/2)     = pi/3
       * acos(-1/2)    = 2*pi/3
       * acos(|x| > 1) = NaN
       * acos(NaN)     = NaN
       *
       */
      P.inverseCosine = P.acos = function () {
        var halfPi,
          x = this,
          Ctor = x.constructor,
          k = x.abs().cmp(1),
          pr = Ctor.precision,
          rm = Ctor.rounding;

        if (k !== -1) {
          return k === 0
            // |x| is 1
            ? x.isNeg() ? getPi(Ctor, pr, rm) : new Ctor(0)
            // |x| > 1 or x is NaN
            : new Ctor(NaN);
        }

        if (x.isZero()) return getPi(Ctor, pr + 4, rm).times(0.5);

        // TODO? Special case acos(0.5) = pi/3 and acos(-0.5) = 2*pi/3

        Ctor.precision = pr + 6;
        Ctor.rounding = 1;

        x = x.asin();
        halfPi = getPi(Ctor, pr + 4, rm).times(0.5);

        Ctor.precision = pr;
        Ctor.rounding = rm;

        return halfPi.minus(x);
      };


      /*
       * Return a new Decimal whose value is the inverse of the hyperbolic cosine in radians of the
       * value of this Decimal.
       *
       * Domain: [1, Infinity]
       * Range: [0, Infinity]
       *
       * acosh(x) = ln(x + sqrt(x^2 - 1))
       *
       * acosh(x < 1)     = NaN
       * acosh(NaN)       = NaN
       * acosh(Infinity)  = Infinity
       * acosh(-Infinity) = NaN
       * acosh(0)         = NaN
       * acosh(-0)        = NaN
       * acosh(1)         = 0
       * acosh(-1)        = NaN
       *
       */
      P.inverseHyperbolicCosine = P.acosh = function () {
        var pr, rm,
          x = this,
          Ctor = x.constructor;

        if (x.lte(1)) return new Ctor(x.eq(1) ? 0 : NaN);
        if (!x.isFinite()) return new Ctor(x);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + Math.max(Math.abs(x.e), x.sd()) + 4;
        Ctor.rounding = 1;
        external = false;

        x = x.times(x).minus(1).sqrt().plus(x);

        external = true;
        Ctor.precision = pr;
        Ctor.rounding = rm;

        return x.ln();
      };


      /*
       * Return a new Decimal whose value is the inverse of the hyperbolic sine in radians of the value
       * of this Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-Infinity, Infinity]
       *
       * asinh(x) = ln(x + sqrt(x^2 + 1))
       *
       * asinh(NaN)       = NaN
       * asinh(Infinity)  = Infinity
       * asinh(-Infinity) = -Infinity
       * asinh(0)         = 0
       * asinh(-0)        = -0
       *
       */
      P.inverseHyperbolicSine = P.asinh = function () {
        var pr, rm,
          x = this,
          Ctor = x.constructor;

        if (!x.isFinite() || x.isZero()) return new Ctor(x);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + 2 * Math.max(Math.abs(x.e), x.sd()) + 6;
        Ctor.rounding = 1;
        external = false;

        x = x.times(x).plus(1).sqrt().plus(x);

        external = true;
        Ctor.precision = pr;
        Ctor.rounding = rm;

        return x.ln();
      };


      /*
       * Return a new Decimal whose value is the inverse of the hyperbolic tangent in radians of the
       * value of this Decimal.
       *
       * Domain: [-1, 1]
       * Range: [-Infinity, Infinity]
       *
       * atanh(x) = 0.5 * ln((1 + x) / (1 - x))
       *
       * atanh(|x| > 1)   = NaN
       * atanh(NaN)       = NaN
       * atanh(Infinity)  = NaN
       * atanh(-Infinity) = NaN
       * atanh(0)         = 0
       * atanh(-0)        = -0
       * atanh(1)         = Infinity
       * atanh(-1)        = -Infinity
       *
       */
      P.inverseHyperbolicTangent = P.atanh = function () {
        var pr, rm, wpr, xsd,
          x = this,
          Ctor = x.constructor;

        if (!x.isFinite()) return new Ctor(NaN);
        if (x.e >= 0) return new Ctor(x.abs().eq(1) ? x.s / 0 : x.isZero() ? x : NaN);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        xsd = x.sd();

        if (Math.max(xsd, pr) < 2 * -x.e - 1) return finalise(new Ctor(x), pr, rm, true);

        Ctor.precision = wpr = xsd - x.e;

        x = divide(x.plus(1), new Ctor(1).minus(x), wpr + pr, 1);

        Ctor.precision = pr + 4;
        Ctor.rounding = 1;

        x = x.ln();

        Ctor.precision = pr;
        Ctor.rounding = rm;

        return x.times(0.5);
      };


      /*
       * Return a new Decimal whose value is the arcsine (inverse sine) in radians of the value of this
       * Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-pi/2, pi/2]
       *
       * asin(x) = 2*atan(x/(1 + sqrt(1 - x^2)))
       *
       * asin(0)       = 0
       * asin(-0)      = -0
       * asin(1/2)     = pi/6
       * asin(-1/2)    = -pi/6
       * asin(1)       = pi/2
       * asin(-1)      = -pi/2
       * asin(|x| > 1) = NaN
       * asin(NaN)     = NaN
       *
       * TODO? Compare performance of Taylor series.
       *
       */
      P.inverseSine = P.asin = function () {
        var halfPi, k,
          pr, rm,
          x = this,
          Ctor = x.constructor;

        if (x.isZero()) return new Ctor(x);

        k = x.abs().cmp(1);
        pr = Ctor.precision;
        rm = Ctor.rounding;

        if (k !== -1) {

          // |x| is 1
          if (k === 0) {
            halfPi = getPi(Ctor, pr + 4, rm).times(0.5);
            halfPi.s = x.s;
            return halfPi;
          }

          // |x| > 1 or x is NaN
          return new Ctor(NaN);
        }

        // TODO? Special case asin(1/2) = pi/6 and asin(-1/2) = -pi/6

        Ctor.precision = pr + 6;
        Ctor.rounding = 1;

        x = x.div(new Ctor(1).minus(x.times(x)).sqrt().plus(1)).atan();

        Ctor.precision = pr;
        Ctor.rounding = rm;

        return x.times(2);
      };


      /*
       * Return a new Decimal whose value is the arctangent (inverse tangent) in radians of the value
       * of this Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-pi/2, pi/2]
       *
       * atan(x) = x - x^3/3 + x^5/5 - x^7/7 + ...
       *
       * atan(0)         = 0
       * atan(-0)        = -0
       * atan(1)         = pi/4
       * atan(-1)        = -pi/4
       * atan(Infinity)  = pi/2
       * atan(-Infinity) = -pi/2
       * atan(NaN)       = NaN
       *
       */
      P.inverseTangent = P.atan = function () {
        var i, j, k, n, px, t, r, wpr, x2,
          x = this,
          Ctor = x.constructor,
          pr = Ctor.precision,
          rm = Ctor.rounding;

        if (!x.isFinite()) {
          if (!x.s) return new Ctor(NaN);
          if (pr + 4 <= PI_PRECISION) {
            r = getPi(Ctor, pr + 4, rm).times(0.5);
            r.s = x.s;
            return r;
          }
        } else if (x.isZero()) {
          return new Ctor(x);
        } else if (x.abs().eq(1) && pr + 4 <= PI_PRECISION) {
          r = getPi(Ctor, pr + 4, rm).times(0.25);
          r.s = x.s;
          return r;
        }

        Ctor.precision = wpr = pr + 10;
        Ctor.rounding = 1;

        // TODO? if (x >= 1 && pr <= PI_PRECISION) atan(x) = halfPi * x.s - atan(1 / x);

        // Argument reduction
        // Ensure |x| < 0.42
        // atan(x) = 2 * atan(x / (1 + sqrt(1 + x^2)))

        k = Math.min(28, wpr / LOG_BASE + 2 | 0);

        for (i = k; i; --i) x = x.div(x.times(x).plus(1).sqrt().plus(1));

        external = false;

        j = Math.ceil(wpr / LOG_BASE);
        n = 1;
        x2 = x.times(x);
        r = new Ctor(x);
        px = x;

        // atan(x) = x - x^3/3 + x^5/5 - x^7/7 + ...
        for (; i !== -1;) {
          px = px.times(x2);
          t = r.minus(px.div(n += 2));

          px = px.times(x2);
          r = t.plus(px.div(n += 2));

          if (r.d[j] !== void 0) for (i = j; r.d[i] === t.d[i] && i--;);
        }

        if (k) r = r.times(2 << (k - 1));

        external = true;

        return finalise(r, Ctor.precision = pr, Ctor.rounding = rm, true);
      };


      /*
       * Return true if the value of this Decimal is a finite number, otherwise return false.
       *
       */
      P.isFinite = function () {
        return !!this.d;
      };


      /*
       * Return true if the value of this Decimal is an integer, otherwise return false.
       *
       */
      P.isInteger = P.isInt = function () {
        return !!this.d && mathfloor(this.e / LOG_BASE) > this.d.length - 2;
      };


      /*
       * Return true if the value of this Decimal is NaN, otherwise return false.
       *
       */
      P.isNaN = function () {
        return !this.s;
      };


      /*
       * Return true if the value of this Decimal is negative, otherwise return false.
       *
       */
      P.isNegative = P.isNeg = function () {
        return this.s < 0;
      };


      /*
       * Return true if the value of this Decimal is positive, otherwise return false.
       *
       */
      P.isPositive = P.isPos = function () {
        return this.s > 0;
      };


      /*
       * Return true if the value of this Decimal is 0 or -0, otherwise return false.
       *
       */
      P.isZero = function () {
        return !!this.d && this.d[0] === 0;
      };


      /*
       * Return true if the value of this Decimal is less than `y`, otherwise return false.
       *
       */
      P.lessThan = P.lt = function (y) {
        return this.cmp(y) < 0;
      };


      /*
       * Return true if the value of this Decimal is less than or equal to `y`, otherwise return false.
       *
       */
      P.lessThanOrEqualTo = P.lte = function (y) {
        return this.cmp(y) < 1;
      };


      /*
       * Return the logarithm of the value of this Decimal to the specified base, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * If no base is specified, return log[10](arg).
       *
       * log[base](arg) = ln(arg) / ln(base)
       *
       * The result will always be correctly rounded if the base of the log is 10, and 'almost always'
       * otherwise:
       *
       * Depending on the rounding mode, the result may be incorrectly rounded if the first fifteen
       * rounding digits are [49]99999999999999 or [50]00000000000000. In that case, the maximum error
       * between the result and the correctly rounded result will be one ulp (unit in the last place).
       *
       * log[-b](a)       = NaN
       * log[0](a)        = NaN
       * log[1](a)        = NaN
       * log[NaN](a)      = NaN
       * log[Infinity](a) = NaN
       * log[b](0)        = -Infinity
       * log[b](-0)       = -Infinity
       * log[b](-a)       = NaN
       * log[b](1)        = 0
       * log[b](Infinity) = Infinity
       * log[b](NaN)      = NaN
       *
       * [base] {number|string|Decimal} The base of the logarithm.
       *
       */
      P.logarithm = P.log = function (base) {
        var isBase10, d, denominator, k, inf, num, sd, r,
          arg = this,
          Ctor = arg.constructor,
          pr = Ctor.precision,
          rm = Ctor.rounding,
          guard = 5;

        // Default base is 10.
        if (base == null) {
          base = new Ctor(10);
          isBase10 = true;
        } else {
          base = new Ctor(base);
          d = base.d;

          // Return NaN if base is negative, or non-finite, or is 0 or 1.
          if (base.s < 0 || !d || !d[0] || base.eq(1)) return new Ctor(NaN);

          isBase10 = base.eq(10);
        }

        d = arg.d;

        // Is arg negative, non-finite, 0 or 1?
        if (arg.s < 0 || !d || !d[0] || arg.eq(1)) {
          return new Ctor(d && !d[0] ? -1 / 0 : arg.s != 1 ? NaN : d ? 0 : 1 / 0);
        }

        // The result will have a non-terminating decimal expansion if base is 10 and arg is not an
        // integer power of 10.
        if (isBase10) {
          if (d.length > 1) {
            inf = true;
          } else {
            for (k = d[0]; k % 10 === 0;) k /= 10;
            inf = k !== 1;
          }
        }

        external = false;
        sd = pr + guard;
        num = naturalLogarithm(arg, sd);
        denominator = isBase10 ? getLn10(Ctor, sd + 10) : naturalLogarithm(base, sd);

        // The result will have 5 rounding digits.
        r = divide(num, denominator, sd, 1);

        // If at a rounding boundary, i.e. the result's rounding digits are [49]9999 or [50]0000,
        // calculate 10 further digits.
        //
        // If the result is known to have an infinite decimal expansion, repeat this until it is clear
        // that the result is above or below the boundary. Otherwise, if after calculating the 10
        // further digits, the last 14 are nines, round up and assume the result is exact.
        // Also assume the result is exact if the last 14 are zero.
        //
        // Example of a result that will be incorrectly rounded:
        // log[1048576](4503599627370502) = 2.60000000000000009610279511444746...
        // The above result correctly rounded using ROUND_CEIL to 1 decimal place should be 2.7, but it
        // will be given as 2.6 as there are 15 zeros immediately after the requested decimal place, so
        // the exact result would be assumed to be 2.6, which rounded using ROUND_CEIL to 1 decimal
        // place is still 2.6.
        if (checkRoundingDigits(r.d, k = pr, rm)) {

          do {
            sd += 10;
            num = naturalLogarithm(arg, sd);
            denominator = isBase10 ? getLn10(Ctor, sd + 10) : naturalLogarithm(base, sd);
            r = divide(num, denominator, sd, 1);

            if (!inf) {

              // Check for 14 nines from the 2nd rounding digit, as the first may be 4.
              if (+digitsToString(r.d).slice(k + 1, k + 15) + 1 == 1e14) {
                r = finalise(r, pr + 1, 0);
              }

              break;
            }
          } while (checkRoundingDigits(r.d, k += 10, rm));
        }

        external = true;

        return finalise(r, pr, rm);
      };


      /*
       * Return a new Decimal whose value is the maximum of the arguments and the value of this Decimal.
       *
       * arguments {number|string|Decimal}
       *
      P.max = function () {
        Array.prototype.push.call(arguments, this);
        return maxOrMin(this.constructor, arguments, 'lt');
      };
       */


      /*
       * Return a new Decimal whose value is the minimum of the arguments and the value of this Decimal.
       *
       * arguments {number|string|Decimal}
       *
      P.min = function () {
        Array.prototype.push.call(arguments, this);
        return maxOrMin(this.constructor, arguments, 'gt');
      };
       */


      /*
       *  n - 0 = n
       *  n - N = N
       *  n - I = -I
       *  0 - n = -n
       *  0 - 0 = 0
       *  0 - N = N
       *  0 - I = -I
       *  N - n = N
       *  N - 0 = N
       *  N - N = N
       *  N - I = N
       *  I - n = I
       *  I - 0 = I
       *  I - N = N
       *  I - I = N
       *
       * Return a new Decimal whose value is the value of this Decimal minus `y`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       */
      P.minus = P.sub = function (y) {
        var d, e, i, j, k, len, pr, rm, xd, xe, xLTy, yd,
          x = this,
          Ctor = x.constructor;

        y = new Ctor(y);

        // If either is not finite...
        if (!x.d || !y.d) {

          // Return NaN if either is NaN.
          if (!x.s || !y.s) y = new Ctor(NaN);

          // Return y negated if x is finite and y is ±Infinity.
          else if (x.d) y.s = -y.s;

          // Return x if y is finite and x is ±Infinity.
          // Return x if both are ±Infinity with different signs.
          // Return NaN if both are ±Infinity with the same sign.
          else y = new Ctor(y.d || x.s !== y.s ? x : NaN);

          return y;
        }

        // If signs differ...
        if (x.s != y.s) {
          y.s = -y.s;
          return x.plus(y);
        }

        xd = x.d;
        yd = y.d;
        pr = Ctor.precision;
        rm = Ctor.rounding;

        // If either is zero...
        if (!xd[0] || !yd[0]) {

          // Return y negated if x is zero and y is non-zero.
          if (yd[0]) y.s = -y.s;

          // Return x if y is zero and x is non-zero.
          else if (xd[0]) y = new Ctor(x);

          // Return zero if both are zero.
          // From IEEE 754 (2008) 6.3: 0 - 0 = -0 - -0 = -0 when rounding to -Infinity.
          else return new Ctor(rm === 3 ? -0 : 0);

          return external ? finalise(y, pr, rm) : y;
        }

        // x and y are finite, non-zero numbers with the same sign.

        // Calculate base 1e7 exponents.
        e = mathfloor(y.e / LOG_BASE);
        xe = mathfloor(x.e / LOG_BASE);

        xd = xd.slice();
        k = xe - e;

        // If base 1e7 exponents differ...
        if (k) {
          xLTy = k < 0;

          if (xLTy) {
            d = xd;
            k = -k;
            len = yd.length;
          } else {
            d = yd;
            e = xe;
            len = xd.length;
          }

          // Numbers with massively different exponents would result in a very high number of
          // zeros needing to be prepended, but this can be avoided while still ensuring correct
          // rounding by limiting the number of zeros to `Math.ceil(pr / LOG_BASE) + 2`.
          i = Math.max(Math.ceil(pr / LOG_BASE), len) + 2;

          if (k > i) {
            k = i;
            d.length = 1;
          }

          // Prepend zeros to equalise exponents.
          d.reverse();
          for (i = k; i--;) d.push(0);
          d.reverse();

        // Base 1e7 exponents equal.
        } else {

          // Check digits to determine which is the bigger number.

          i = xd.length;
          len = yd.length;
          xLTy = i < len;
          if (xLTy) len = i;

          for (i = 0; i < len; i++) {
            if (xd[i] != yd[i]) {
              xLTy = xd[i] < yd[i];
              break;
            }
          }

          k = 0;
        }

        if (xLTy) {
          d = xd;
          xd = yd;
          yd = d;
          y.s = -y.s;
        }

        len = xd.length;

        // Append zeros to `xd` if shorter.
        // Don't add zeros to `yd` if shorter as subtraction only needs to start at `yd` length.
        for (i = yd.length - len; i > 0; --i) xd[len++] = 0;

        // Subtract yd from xd.
        for (i = yd.length; i > k;) {

          if (xd[--i] < yd[i]) {
            for (j = i; j && xd[--j] === 0;) xd[j] = BASE - 1;
            --xd[j];
            xd[i] += BASE;
          }

          xd[i] -= yd[i];
        }

        // Remove trailing zeros.
        for (; xd[--len] === 0;) xd.pop();

        // Remove leading zeros and adjust exponent accordingly.
        for (; xd[0] === 0; xd.shift()) --e;

        // Zero?
        if (!xd[0]) return new Ctor(rm === 3 ? -0 : 0);

        y.d = xd;
        y.e = getBase10Exponent(xd, e);

        return external ? finalise(y, pr, rm) : y;
      };


      /*
       *   n % 0 =  N
       *   n % N =  N
       *   n % I =  n
       *   0 % n =  0
       *  -0 % n = -0
       *   0 % 0 =  N
       *   0 % N =  N
       *   0 % I =  0
       *   N % n =  N
       *   N % 0 =  N
       *   N % N =  N
       *   N % I =  N
       *   I % n =  N
       *   I % 0 =  N
       *   I % N =  N
       *   I % I =  N
       *
       * Return a new Decimal whose value is the value of this Decimal modulo `y`, rounded to
       * `precision` significant digits using rounding mode `rounding`.
       *
       * The result depends on the modulo mode.
       *
       */
      P.modulo = P.mod = function (y) {
        var q,
          x = this,
          Ctor = x.constructor;

        y = new Ctor(y);

        // Return NaN if x is ±Infinity or NaN, or y is NaN or ±0.
        if (!x.d || !y.s || y.d && !y.d[0]) return new Ctor(NaN);

        // Return x if y is ±Infinity or x is ±0.
        if (!y.d || x.d && !x.d[0]) {
          return finalise(new Ctor(x), Ctor.precision, Ctor.rounding);
        }

        // Prevent rounding of intermediate calculations.
        external = false;

        if (Ctor.modulo == 9) {

          // Euclidian division: q = sign(y) * floor(x / abs(y))
          // result = x - q * y    where  0 <= result < abs(y)
          q = divide(x, y.abs(), 0, 3, 1);
          q.s *= y.s;
        } else {
          q = divide(x, y, 0, Ctor.modulo, 1);
        }

        q = q.times(y);

        external = true;

        return x.minus(q);
      };


      /*
       * Return a new Decimal whose value is the natural exponential of the value of this Decimal,
       * i.e. the base e raised to the power the value of this Decimal, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       */
      P.naturalExponential = P.exp = function () {
        return naturalExponential(this);
      };


      /*
       * Return a new Decimal whose value is the natural logarithm of the value of this Decimal,
       * rounded to `precision` significant digits using rounding mode `rounding`.
       *
       */
      P.naturalLogarithm = P.ln = function () {
        return naturalLogarithm(this);
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal negated, i.e. as if multiplied by
       * -1.
       *
       */
      P.negated = P.neg = function () {
        var x = new this.constructor(this);
        x.s = -x.s;
        return finalise(x);
      };


      /*
       *  n + 0 = n
       *  n + N = N
       *  n + I = I
       *  0 + n = n
       *  0 + 0 = 0
       *  0 + N = N
       *  0 + I = I
       *  N + n = N
       *  N + 0 = N
       *  N + N = N
       *  N + I = N
       *  I + n = I
       *  I + 0 = I
       *  I + N = N
       *  I + I = I
       *
       * Return a new Decimal whose value is the value of this Decimal plus `y`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       */
      P.plus = P.add = function (y) {
        var carry, d, e, i, k, len, pr, rm, xd, yd,
          x = this,
          Ctor = x.constructor;

        y = new Ctor(y);

        // If either is not finite...
        if (!x.d || !y.d) {

          // Return NaN if either is NaN.
          if (!x.s || !y.s) y = new Ctor(NaN);

          // Return x if y is finite and x is ±Infinity.
          // Return x if both are ±Infinity with the same sign.
          // Return NaN if both are ±Infinity with different signs.
          // Return y if x is finite and y is ±Infinity.
          else if (!x.d) y = new Ctor(y.d || x.s === y.s ? x : NaN);

          return y;
        }

         // If signs differ...
        if (x.s != y.s) {
          y.s = -y.s;
          return x.minus(y);
        }

        xd = x.d;
        yd = y.d;
        pr = Ctor.precision;
        rm = Ctor.rounding;

        // If either is zero...
        if (!xd[0] || !yd[0]) {

          // Return x if y is zero.
          // Return y if y is non-zero.
          if (!yd[0]) y = new Ctor(x);

          return external ? finalise(y, pr, rm) : y;
        }

        // x and y are finite, non-zero numbers with the same sign.

        // Calculate base 1e7 exponents.
        k = mathfloor(x.e / LOG_BASE);
        e = mathfloor(y.e / LOG_BASE);

        xd = xd.slice();
        i = k - e;

        // If base 1e7 exponents differ...
        if (i) {

          if (i < 0) {
            d = xd;
            i = -i;
            len = yd.length;
          } else {
            d = yd;
            e = k;
            len = xd.length;
          }

          // Limit number of zeros prepended to max(ceil(pr / LOG_BASE), len) + 1.
          k = Math.ceil(pr / LOG_BASE);
          len = k > len ? k + 1 : len + 1;

          if (i > len) {
            i = len;
            d.length = 1;
          }

          // Prepend zeros to equalise exponents. Note: Faster to use reverse then do unshifts.
          d.reverse();
          for (; i--;) d.push(0);
          d.reverse();
        }

        len = xd.length;
        i = yd.length;

        // If yd is longer than xd, swap xd and yd so xd points to the longer array.
        if (len - i < 0) {
          i = len;
          d = yd;
          yd = xd;
          xd = d;
        }

        // Only start adding at yd.length - 1 as the further digits of xd can be left as they are.
        for (carry = 0; i;) {
          carry = (xd[--i] = xd[i] + yd[i] + carry) / BASE | 0;
          xd[i] %= BASE;
        }

        if (carry) {
          xd.unshift(carry);
          ++e;
        }

        // Remove trailing zeros.
        // No need to check for zero, as +x + +y != 0 && -x + -y != 0
        for (len = xd.length; xd[--len] == 0;) xd.pop();

        y.d = xd;
        y.e = getBase10Exponent(xd, e);

        return external ? finalise(y, pr, rm) : y;
      };


      /*
       * Return the number of significant digits of the value of this Decimal.
       *
       * [z] {boolean|number} Whether to count integer-part trailing zeros: true, false, 1 or 0.
       *
       */
      P.precision = P.sd = function (z) {
        var k,
          x = this;

        if (z !== void 0 && z !== !!z && z !== 1 && z !== 0) throw Error(invalidArgument + z);

        if (x.d) {
          k = getPrecision(x.d);
          if (z && x.e + 1 > k) k = x.e + 1;
        } else {
          k = NaN;
        }

        return k;
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal rounded to a whole number using
       * rounding mode `rounding`.
       *
       */
      P.round = function () {
        var x = this,
          Ctor = x.constructor;

        return finalise(new Ctor(x), x.e + 1, Ctor.rounding);
      };


      /*
       * Return a new Decimal whose value is the sine of the value in radians of this Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-1, 1]
       *
       * sin(x) = x - x^3/3! + x^5/5! - ...
       *
       * sin(0)         = 0
       * sin(-0)        = -0
       * sin(Infinity)  = NaN
       * sin(-Infinity) = NaN
       * sin(NaN)       = NaN
       *
       */
      P.sine = P.sin = function () {
        var pr, rm,
          x = this,
          Ctor = x.constructor;

        if (!x.isFinite()) return new Ctor(NaN);
        if (x.isZero()) return new Ctor(x);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + Math.max(x.e, x.sd()) + LOG_BASE;
        Ctor.rounding = 1;

        x = sine(Ctor, toLessThanHalfPi(Ctor, x));

        Ctor.precision = pr;
        Ctor.rounding = rm;

        return finalise(quadrant > 2 ? x.neg() : x, pr, rm, true);
      };


      /*
       * Return a new Decimal whose value is the square root of this Decimal, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       *  sqrt(-n) =  N
       *  sqrt(N)  =  N
       *  sqrt(-I) =  N
       *  sqrt(I)  =  I
       *  sqrt(0)  =  0
       *  sqrt(-0) = -0
       *
       */
      P.squareRoot = P.sqrt = function () {
        var m, n, sd, r, rep, t,
          x = this,
          d = x.d,
          e = x.e,
          s = x.s,
          Ctor = x.constructor;

        // Negative/NaN/Infinity/zero?
        if (s !== 1 || !d || !d[0]) {
          return new Ctor(!s || s < 0 && (!d || d[0]) ? NaN : d ? x : 1 / 0);
        }

        external = false;

        // Initial estimate.
        s = Math.sqrt(+x);

        // Math.sqrt underflow/overflow?
        // Pass x to Math.sqrt as integer, then adjust the exponent of the result.
        if (s == 0 || s == 1 / 0) {
          n = digitsToString(d);

          if ((n.length + e) % 2 == 0) n += '0';
          s = Math.sqrt(n);
          e = mathfloor((e + 1) / 2) - (e < 0 || e % 2);

          if (s == 1 / 0) {
            n = '5e' + e;
          } else {
            n = s.toExponential();
            n = n.slice(0, n.indexOf('e') + 1) + e;
          }

          r = new Ctor(n);
        } else {
          r = new Ctor(s.toString());
        }

        sd = (e = Ctor.precision) + 3;

        // Newton-Raphson iteration.
        for (;;) {
          t = r;
          r = t.plus(divide(x, t, sd + 2, 1)).times(0.5);

          // TODO? Replace with for-loop and checkRoundingDigits.
          if (digitsToString(t.d).slice(0, sd) === (n = digitsToString(r.d)).slice(0, sd)) {
            n = n.slice(sd - 3, sd + 1);

            // The 4th rounding digit may be in error by -1 so if the 4 rounding digits are 9999 or
            // 4999, i.e. approaching a rounding boundary, continue the iteration.
            if (n == '9999' || !rep && n == '4999') {

              // On the first iteration only, check to see if rounding up gives the exact result as the
              // nines may infinitely repeat.
              if (!rep) {
                finalise(t, e + 1, 0);

                if (t.times(t).eq(x)) {
                  r = t;
                  break;
                }
              }

              sd += 4;
              rep = 1;
            } else {

              // If the rounding digits are null, 0{0,4} or 50{0,3}, check for an exact result.
              // If not, then there are further digits and m will be truthy.
              if (!+n || !+n.slice(1) && n.charAt(0) == '5') {

                // Truncate to the first rounding digit.
                finalise(r, e + 1, 1);
                m = !r.times(r).eq(x);
              }

              break;
            }
          }
        }

        external = true;

        return finalise(r, e, Ctor.rounding, m);
      };


      /*
       * Return a new Decimal whose value is the tangent of the value in radians of this Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-Infinity, Infinity]
       *
       * tan(0)         = 0
       * tan(-0)        = -0
       * tan(Infinity)  = NaN
       * tan(-Infinity) = NaN
       * tan(NaN)       = NaN
       *
       */
      P.tangent = P.tan = function () {
        var pr, rm,
          x = this,
          Ctor = x.constructor;

        if (!x.isFinite()) return new Ctor(NaN);
        if (x.isZero()) return new Ctor(x);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + 10;
        Ctor.rounding = 1;

        x = x.sin();
        x.s = 1;
        x = divide(x, new Ctor(1).minus(x.times(x)).sqrt(), pr + 10, 0);

        Ctor.precision = pr;
        Ctor.rounding = rm;

        return finalise(quadrant == 2 || quadrant == 4 ? x.neg() : x, pr, rm, true);
      };


      /*
       *  n * 0 = 0
       *  n * N = N
       *  n * I = I
       *  0 * n = 0
       *  0 * 0 = 0
       *  0 * N = N
       *  0 * I = N
       *  N * n = N
       *  N * 0 = N
       *  N * N = N
       *  N * I = N
       *  I * n = I
       *  I * 0 = N
       *  I * N = N
       *  I * I = I
       *
       * Return a new Decimal whose value is this Decimal times `y`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       */
      P.times = P.mul = function (y) {
        var carry, e, i, k, r, rL, t, xdL, ydL,
          x = this,
          Ctor = x.constructor,
          xd = x.d,
          yd = (y = new Ctor(y)).d;

        y.s *= x.s;

         // If either is NaN, ±Infinity or ±0...
        if (!xd || !xd[0] || !yd || !yd[0]) {

          return new Ctor(!y.s || xd && !xd[0] && !yd || yd && !yd[0] && !xd

            // Return NaN if either is NaN.
            // Return NaN if x is ±0 and y is ±Infinity, or y is ±0 and x is ±Infinity.
            ? NaN

            // Return ±Infinity if either is ±Infinity.
            // Return ±0 if either is ±0.
            : !xd || !yd ? y.s / 0 : y.s * 0);
        }

        e = mathfloor(x.e / LOG_BASE) + mathfloor(y.e / LOG_BASE);
        xdL = xd.length;
        ydL = yd.length;

        // Ensure xd points to the longer array.
        if (xdL < ydL) {
          r = xd;
          xd = yd;
          yd = r;
          rL = xdL;
          xdL = ydL;
          ydL = rL;
        }

        // Initialise the result array with zeros.
        r = [];
        rL = xdL + ydL;
        for (i = rL; i--;) r.push(0);

        // Multiply!
        for (i = ydL; --i >= 0;) {
          carry = 0;
          for (k = xdL + i; k > i;) {
            t = r[k] + yd[i] * xd[k - i - 1] + carry;
            r[k--] = t % BASE | 0;
            carry = t / BASE | 0;
          }

          r[k] = (r[k] + carry) % BASE | 0;
        }

        // Remove trailing zeros.
        for (; !r[--rL];) r.pop();

        if (carry) ++e;
        else r.shift();

        y.d = r;
        y.e = getBase10Exponent(r, e);

        return external ? finalise(y, Ctor.precision, Ctor.rounding) : y;
      };


      /*
       * Return a string representing the value of this Decimal in base 2, round to `sd` significant
       * digits using rounding mode `rm`.
       *
       * If the optional `sd` argument is present then return binary exponential notation.
       *
       * [sd] {number} Significant digits. Integer, 1 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       */
      P.toBinary = function (sd, rm) {
        return toStringBinary(this, 2, sd, rm);
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal rounded to a maximum of `dp`
       * decimal places using rounding mode `rm` or `rounding` if `rm` is omitted.
       *
       * If `dp` is omitted, return a new Decimal whose value is the value of this Decimal.
       *
       * [dp] {number} Decimal places. Integer, 0 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       */
      P.toDecimalPlaces = P.toDP = function (dp, rm) {
        var x = this,
          Ctor = x.constructor;

        x = new Ctor(x);
        if (dp === void 0) return x;

        checkInt32(dp, 0, MAX_DIGITS);

        if (rm === void 0) rm = Ctor.rounding;
        else checkInt32(rm, 0, 8);

        return finalise(x, dp + x.e + 1, rm);
      };


      /*
       * Return a string representing the value of this Decimal in exponential notation rounded to
       * `dp` fixed decimal places using rounding mode `rounding`.
       *
       * [dp] {number} Decimal places. Integer, 0 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       */
      P.toExponential = function (dp, rm) {
        var str,
          x = this,
          Ctor = x.constructor;

        if (dp === void 0) {
          str = finiteToString(x, true);
        } else {
          checkInt32(dp, 0, MAX_DIGITS);

          if (rm === void 0) rm = Ctor.rounding;
          else checkInt32(rm, 0, 8);

          x = finalise(new Ctor(x), dp + 1, rm);
          str = finiteToString(x, true, dp + 1);
        }

        return x.isNeg() && !x.isZero() ? '-' + str : str;
      };


      /*
       * Return a string representing the value of this Decimal in normal (fixed-point) notation to
       * `dp` fixed decimal places and rounded using rounding mode `rm` or `rounding` if `rm` is
       * omitted.
       *
       * As with JavaScript numbers, (-0).toFixed(0) is '0', but e.g. (-0.00001).toFixed(0) is '-0'.
       *
       * [dp] {number} Decimal places. Integer, 0 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       * (-0).toFixed(0) is '0', but (-0.1).toFixed(0) is '-0'.
       * (-0).toFixed(1) is '0.0', but (-0.01).toFixed(1) is '-0.0'.
       * (-0).toFixed(3) is '0.000'.
       * (-0.5).toFixed(0) is '-0'.
       *
       */
      P.toFixed = function (dp, rm) {
        var str, y,
          x = this,
          Ctor = x.constructor;

        if (dp === void 0) {
          str = finiteToString(x);
        } else {
          checkInt32(dp, 0, MAX_DIGITS);

          if (rm === void 0) rm = Ctor.rounding;
          else checkInt32(rm, 0, 8);

          y = finalise(new Ctor(x), dp + x.e + 1, rm);
          str = finiteToString(y, false, dp + y.e + 1);
        }

        // To determine whether to add the minus sign look at the value before it was rounded,
        // i.e. look at `x` rather than `y`.
        return x.isNeg() && !x.isZero() ? '-' + str : str;
      };


      /*
       * Return an array representing the value of this Decimal as a simple fraction with an integer
       * numerator and an integer denominator.
       *
       * The denominator will be a positive non-zero value less than or equal to the specified maximum
       * denominator. If a maximum denominator is not specified, the denominator will be the lowest
       * value necessary to represent the number exactly.
       *
       * [maxD] {number|string|Decimal} Maximum denominator. Integer >= 1 and < Infinity.
       *
       */
      P.toFraction = function (maxD) {
        var d, d0, d1, d2, e, k, n, n0, n1, pr, q, r,
          x = this,
          xd = x.d,
          Ctor = x.constructor;

        if (!xd) return new Ctor(x);

        n1 = d0 = new Ctor(1);
        d1 = n0 = new Ctor(0);

        d = new Ctor(d1);
        e = d.e = getPrecision(xd) - x.e - 1;
        k = e % LOG_BASE;
        d.d[0] = mathpow(10, k < 0 ? LOG_BASE + k : k);

        if (maxD == null) {

          // d is 10**e, the minimum max-denominator needed.
          maxD = e > 0 ? d : n1;
        } else {
          n = new Ctor(maxD);
          if (!n.isInt() || n.lt(n1)) throw Error(invalidArgument + n);
          maxD = n.gt(d) ? (e > 0 ? d : n1) : n;
        }

        external = false;
        n = new Ctor(digitsToString(xd));
        pr = Ctor.precision;
        Ctor.precision = e = xd.length * LOG_BASE * 2;

        for (;;)  {
          q = divide(n, d, 0, 1, 1);
          d2 = d0.plus(q.times(d1));
          if (d2.cmp(maxD) == 1) break;
          d0 = d1;
          d1 = d2;
          d2 = n1;
          n1 = n0.plus(q.times(d2));
          n0 = d2;
          d2 = d;
          d = n.minus(q.times(d2));
          n = d2;
        }

        d2 = divide(maxD.minus(d0), d1, 0, 1, 1);
        n0 = n0.plus(d2.times(n1));
        d0 = d0.plus(d2.times(d1));
        n0.s = n1.s = x.s;

        // Determine which fraction is closer to x, n0/d0 or n1/d1?
        r = divide(n1, d1, e, 1).minus(x).abs().cmp(divide(n0, d0, e, 1).minus(x).abs()) < 1
            ? [n1, d1] : [n0, d0];

        Ctor.precision = pr;
        external = true;

        return r;
      };


      /*
       * Return a string representing the value of this Decimal in base 16, round to `sd` significant
       * digits using rounding mode `rm`.
       *
       * If the optional `sd` argument is present then return binary exponential notation.
       *
       * [sd] {number} Significant digits. Integer, 1 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       */
      P.toHexadecimal = P.toHex = function (sd, rm) {
        return toStringBinary(this, 16, sd, rm);
      };


      /*
       * Returns a new Decimal whose value is the nearest multiple of `y` in the direction of rounding
       * mode `rm`, or `Decimal.rounding` if `rm` is omitted, to the value of this Decimal.
       *
       * The return value will always have the same sign as this Decimal, unless either this Decimal
       * or `y` is NaN, in which case the return value will be also be NaN.
       *
       * The return value is not affected by the value of `precision`.
       *
       * y {number|string|Decimal} The magnitude to round to a multiple of.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       * 'toNearest() rounding mode not an integer: {rm}'
       * 'toNearest() rounding mode out of range: {rm}'
       *
       */
      P.toNearest = function (y, rm) {
        var x = this,
          Ctor = x.constructor;

        x = new Ctor(x);

        if (y == null) {

          // If x is not finite, return x.
          if (!x.d) return x;

          y = new Ctor(1);
          rm = Ctor.rounding;
        } else {
          y = new Ctor(y);
          if (rm === void 0) {
            rm = Ctor.rounding;
          } else {
            checkInt32(rm, 0, 8);
          }

          // If x is not finite, return x if y is not NaN, else NaN.
          if (!x.d) return y.s ? x : y;

          // If y is not finite, return Infinity with the sign of x if y is Infinity, else NaN.
          if (!y.d) {
            if (y.s) y.s = x.s;
            return y;
          }
        }

        // If y is not zero, calculate the nearest multiple of y to x.
        if (y.d[0]) {
          external = false;
          x = divide(x, y, 0, rm, 1).times(y);
          external = true;
          finalise(x);

        // If y is zero, return zero with the sign of x.
        } else {
          y.s = x.s;
          x = y;
        }

        return x;
      };


      /*
       * Return the value of this Decimal converted to a number primitive.
       * Zero keeps its sign.
       *
       */
      P.toNumber = function () {
        return +this;
      };


      /*
       * Return a string representing the value of this Decimal in base 8, round to `sd` significant
       * digits using rounding mode `rm`.
       *
       * If the optional `sd` argument is present then return binary exponential notation.
       *
       * [sd] {number} Significant digits. Integer, 1 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       */
      P.toOctal = function (sd, rm) {
        return toStringBinary(this, 8, sd, rm);
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal raised to the power `y`, rounded
       * to `precision` significant digits using rounding mode `rounding`.
       *
       * ECMAScript compliant.
       *
       *   pow(x, NaN)                           = NaN
       *   pow(x, ±0)                            = 1

       *   pow(NaN, non-zero)                    = NaN
       *   pow(abs(x) > 1, +Infinity)            = +Infinity
       *   pow(abs(x) > 1, -Infinity)            = +0
       *   pow(abs(x) == 1, ±Infinity)           = NaN
       *   pow(abs(x) < 1, +Infinity)            = +0
       *   pow(abs(x) < 1, -Infinity)            = +Infinity
       *   pow(+Infinity, y > 0)                 = +Infinity
       *   pow(+Infinity, y < 0)                 = +0
       *   pow(-Infinity, odd integer > 0)       = -Infinity
       *   pow(-Infinity, even integer > 0)      = +Infinity
       *   pow(-Infinity, odd integer < 0)       = -0
       *   pow(-Infinity, even integer < 0)      = +0
       *   pow(+0, y > 0)                        = +0
       *   pow(+0, y < 0)                        = +Infinity
       *   pow(-0, odd integer > 0)              = -0
       *   pow(-0, even integer > 0)             = +0
       *   pow(-0, odd integer < 0)              = -Infinity
       *   pow(-0, even integer < 0)             = +Infinity
       *   pow(finite x < 0, finite non-integer) = NaN
       *
       * For non-integer or very large exponents pow(x, y) is calculated using
       *
       *   x^y = exp(y*ln(x))
       *
       * Assuming the first 15 rounding digits are each equally likely to be any digit 0-9, the
       * probability of an incorrectly rounded result
       * P([49]9{14} | [50]0{14}) = 2 * 0.2 * 10^-14 = 4e-15 = 1/2.5e+14
       * i.e. 1 in 250,000,000,000,000
       *
       * If a result is incorrectly rounded the maximum error will be 1 ulp (unit in last place).
       *
       * y {number|string|Decimal} The power to which to raise this Decimal.
       *
       */
      P.toPower = P.pow = function (y) {
        var e, k, pr, r, rm, s,
          x = this,
          Ctor = x.constructor,
          yn = +(y = new Ctor(y));

        // Either ±Infinity, NaN or ±0?
        if (!x.d || !y.d || !x.d[0] || !y.d[0]) return new Ctor(mathpow(+x, yn));

        x = new Ctor(x);

        if (x.eq(1)) return x;

        pr = Ctor.precision;
        rm = Ctor.rounding;

        if (y.eq(1)) return finalise(x, pr, rm);

        // y exponent
        e = mathfloor(y.e / LOG_BASE);

        // If y is a small integer use the 'exponentiation by squaring' algorithm.
        if (e >= y.d.length - 1 && (k = yn < 0 ? -yn : yn) <= MAX_SAFE_INTEGER) {
          r = intPow(Ctor, x, k, pr);
          return y.s < 0 ? new Ctor(1).div(r) : finalise(r, pr, rm);
        }

        s = x.s;

        // if x is negative
        if (s < 0) {

          // if y is not an integer
          if (e < y.d.length - 1) return new Ctor(NaN);

          // Result is positive if x is negative and the last digit of integer y is even.
          if ((y.d[e] & 1) == 0) s = 1;

          // if x.eq(-1)
          if (x.e == 0 && x.d[0] == 1 && x.d.length == 1) {
            x.s = s;
            return x;
          }
        }

        // Estimate result exponent.
        // x^y = 10^e,  where e = y * log10(x)
        // log10(x) = log10(x_significand) + x_exponent
        // log10(x_significand) = ln(x_significand) / ln(10)
        k = mathpow(+x, yn);
        e = k == 0 || !isFinite(k)
          ? mathfloor(yn * (Math.log('0.' + digitsToString(x.d)) / Math.LN10 + x.e + 1))
          : new Ctor(k + '').e;

        // Exponent estimate may be incorrect e.g. x: 0.999999999999999999, y: 2.29, e: 0, r.e: -1.

        // Overflow/underflow?
        if (e > Ctor.maxE + 1 || e < Ctor.minE - 1) return new Ctor(e > 0 ? s / 0 : 0);

        external = false;
        Ctor.rounding = x.s = 1;

        // Estimate the extra guard digits needed to ensure five correct rounding digits from
        // naturalLogarithm(x). Example of failure without these extra digits (precision: 10):
        // new Decimal(2.32456).pow('2087987436534566.46411')
        // should be 1.162377823e+764914905173815, but is 1.162355823e+764914905173815
        k = Math.min(12, (e + '').length);

        // r = x^y = exp(y*ln(x))
        r = naturalExponential(y.times(naturalLogarithm(x, pr + k)), pr);

        // r may be Infinity, e.g. (0.9999999999999999).pow(-1e+40)
        if (r.d) {

          // Truncate to the required precision plus five rounding digits.
          r = finalise(r, pr + 5, 1);

          // If the rounding digits are [49]9999 or [50]0000 increase the precision by 10 and recalculate
          // the result.
          if (checkRoundingDigits(r.d, pr, rm)) {
            e = pr + 10;

            // Truncate to the increased precision plus five rounding digits.
            r = finalise(naturalExponential(y.times(naturalLogarithm(x, e + k)), e), e + 5, 1);

            // Check for 14 nines from the 2nd rounding digit (the first rounding digit may be 4 or 9).
            if (+digitsToString(r.d).slice(pr + 1, pr + 15) + 1 == 1e14) {
              r = finalise(r, pr + 1, 0);
            }
          }
        }

        r.s = s;
        external = true;
        Ctor.rounding = rm;

        return finalise(r, pr, rm);
      };


      /*
       * Return a string representing the value of this Decimal rounded to `sd` significant digits
       * using rounding mode `rounding`.
       *
       * Return exponential notation if `sd` is less than the number of digits necessary to represent
       * the integer part of the value in normal notation.
       *
       * [sd] {number} Significant digits. Integer, 1 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       */
      P.toPrecision = function (sd, rm) {
        var str,
          x = this,
          Ctor = x.constructor;

        if (sd === void 0) {
          str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);
        } else {
          checkInt32(sd, 1, MAX_DIGITS);

          if (rm === void 0) rm = Ctor.rounding;
          else checkInt32(rm, 0, 8);

          x = finalise(new Ctor(x), sd, rm);
          str = finiteToString(x, sd <= x.e || x.e <= Ctor.toExpNeg, sd);
        }

        return x.isNeg() && !x.isZero() ? '-' + str : str;
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal rounded to a maximum of `sd`
       * significant digits using rounding mode `rm`, or to `precision` and `rounding` respectively if
       * omitted.
       *
       * [sd] {number} Significant digits. Integer, 1 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       * 'toSD() digits out of range: {sd}'
       * 'toSD() digits not an integer: {sd}'
       * 'toSD() rounding mode not an integer: {rm}'
       * 'toSD() rounding mode out of range: {rm}'
       *
       */
      P.toSignificantDigits = P.toSD = function (sd, rm) {
        var x = this,
          Ctor = x.constructor;

        if (sd === void 0) {
          sd = Ctor.precision;
          rm = Ctor.rounding;
        } else {
          checkInt32(sd, 1, MAX_DIGITS);

          if (rm === void 0) rm = Ctor.rounding;
          else checkInt32(rm, 0, 8);
        }

        return finalise(new Ctor(x), sd, rm);
      };


      /*
       * Return a string representing the value of this Decimal.
       *
       * Return exponential notation if this Decimal has a positive exponent equal to or greater than
       * `toExpPos`, or a negative exponent equal to or less than `toExpNeg`.
       *
       */
      P.toString = function () {
        var x = this,
          Ctor = x.constructor,
          str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);

        return x.isNeg() && !x.isZero() ? '-' + str : str;
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal truncated to a whole number.
       *
       */
      P.truncated = P.trunc = function () {
        return finalise(new this.constructor(this), this.e + 1, 1);
      };


      /*
       * Return a string representing the value of this Decimal.
       * Unlike `toString`, negative zero will include the minus sign.
       *
       */
      P.valueOf = P.toJSON = function () {
        var x = this,
          Ctor = x.constructor,
          str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);

        return x.isNeg() ? '-' + str : str;
      };


      // Helper functions for Decimal.prototype (P) and/or Decimal methods, and their callers.


      /*
       *  digitsToString           P.cubeRoot, P.logarithm, P.squareRoot, P.toFraction, P.toPower,
       *                           finiteToString, naturalExponential, naturalLogarithm
       *  checkInt32               P.toDecimalPlaces, P.toExponential, P.toFixed, P.toNearest,
       *                           P.toPrecision, P.toSignificantDigits, toStringBinary, random
       *  checkRoundingDigits      P.logarithm, P.toPower, naturalExponential, naturalLogarithm
       *  convertBase              toStringBinary, parseOther
       *  cos                      P.cos
       *  divide                   P.atanh, P.cubeRoot, P.dividedBy, P.dividedToIntegerBy,
       *                           P.logarithm, P.modulo, P.squareRoot, P.tan, P.tanh, P.toFraction,
       *                           P.toNearest, toStringBinary, naturalExponential, naturalLogarithm,
       *                           taylorSeries, atan2, parseOther
       *  finalise                 P.absoluteValue, P.atan, P.atanh, P.ceil, P.cos, P.cosh,
       *                           P.cubeRoot, P.dividedToIntegerBy, P.floor, P.logarithm, P.minus,
       *                           P.modulo, P.negated, P.plus, P.round, P.sin, P.sinh, P.squareRoot,
       *                           P.tan, P.times, P.toDecimalPlaces, P.toExponential, P.toFixed,
       *                           P.toNearest, P.toPower, P.toPrecision, P.toSignificantDigits,
       *                           P.truncated, divide, getLn10, getPi, naturalExponential,
       *                           naturalLogarithm, ceil, floor, round, trunc
       *  finiteToString           P.toExponential, P.toFixed, P.toPrecision, P.toString, P.valueOf,
       *                           toStringBinary
       *  getBase10Exponent        P.minus, P.plus, P.times, parseOther
       *  getLn10                  P.logarithm, naturalLogarithm
       *  getPi                    P.acos, P.asin, P.atan, toLessThanHalfPi, atan2
       *  getPrecision             P.precision, P.toFraction
       *  getZeroString            digitsToString, finiteToString
       *  intPow                   P.toPower, parseOther
       *  isOdd                    toLessThanHalfPi
       *  maxOrMin                 max, min
       *  naturalExponential       P.naturalExponential, P.toPower
       *  naturalLogarithm         P.acosh, P.asinh, P.atanh, P.logarithm, P.naturalLogarithm,
       *                           P.toPower, naturalExponential
       *  nonFiniteToString        finiteToString, toStringBinary
       *  parseDecimal             Decimal
       *  parseOther               Decimal
       *  sin                      P.sin
       *  taylorSeries             P.cosh, P.sinh, cos, sin
       *  toLessThanHalfPi         P.cos, P.sin
       *  toStringBinary           P.toBinary, P.toHexadecimal, P.toOctal
       *  truncate                 intPow
       *
       *  Throws:                  P.logarithm, P.precision, P.toFraction, checkInt32, getLn10, getPi,
       *                           naturalLogarithm, config, parseOther, random, Decimal
       */


      function digitsToString(d) {
        var i, k, ws,
          indexOfLastWord = d.length - 1,
          str = '',
          w = d[0];

        if (indexOfLastWord > 0) {
          str += w;
          for (i = 1; i < indexOfLastWord; i++) {
            ws = d[i] + '';
            k = LOG_BASE - ws.length;
            if (k) str += getZeroString(k);
            str += ws;
          }

          w = d[i];
          ws = w + '';
          k = LOG_BASE - ws.length;
          if (k) str += getZeroString(k);
        } else if (w === 0) {
          return '0';
        }

        // Remove trailing zeros of last w.
        for (; w % 10 === 0;) w /= 10;

        return str + w;
      }


      function checkInt32(i, min, max) {
        if (i !== ~~i || i < min || i > max) {
          throw Error(invalidArgument + i);
        }
      }


      /*
       * Check 5 rounding digits if `repeating` is null, 4 otherwise.
       * `repeating == null` if caller is `log` or `pow`,
       * `repeating != null` if caller is `naturalLogarithm` or `naturalExponential`.
       */
      function checkRoundingDigits(d, i, rm, repeating) {
        var di, k, r, rd;

        // Get the length of the first word of the array d.
        for (k = d[0]; k >= 10; k /= 10) --i;

        // Is the rounding digit in the first word of d?
        if (--i < 0) {
          i += LOG_BASE;
          di = 0;
        } else {
          di = Math.ceil((i + 1) / LOG_BASE);
          i %= LOG_BASE;
        }

        // i is the index (0 - 6) of the rounding digit.
        // E.g. if within the word 3487563 the first rounding digit is 5,
        // then i = 4, k = 1000, rd = 3487563 % 1000 = 563
        k = mathpow(10, LOG_BASE - i);
        rd = d[di] % k | 0;

        if (repeating == null) {
          if (i < 3) {
            if (i == 0) rd = rd / 100 | 0;
            else if (i == 1) rd = rd / 10 | 0;
            r = rm < 4 && rd == 99999 || rm > 3 && rd == 49999 || rd == 50000 || rd == 0;
          } else {
            r = (rm < 4 && rd + 1 == k || rm > 3 && rd + 1 == k / 2) &&
              (d[di + 1] / k / 100 | 0) == mathpow(10, i - 2) - 1 ||
                (rd == k / 2 || rd == 0) && (d[di + 1] / k / 100 | 0) == 0;
          }
        } else {
          if (i < 4) {
            if (i == 0) rd = rd / 1000 | 0;
            else if (i == 1) rd = rd / 100 | 0;
            else if (i == 2) rd = rd / 10 | 0;
            r = (repeating || rm < 4) && rd == 9999 || !repeating && rm > 3 && rd == 4999;
          } else {
            r = ((repeating || rm < 4) && rd + 1 == k ||
            (!repeating && rm > 3) && rd + 1 == k / 2) &&
              (d[di + 1] / k / 1000 | 0) == mathpow(10, i - 3) - 1;
          }
        }

        return r;
      }


      // Convert string of `baseIn` to an array of numbers of `baseOut`.
      // Eg. convertBase('255', 10, 16) returns [15, 15].
      // Eg. convertBase('ff', 16, 10) returns [2, 5, 5].
      function convertBase(str, baseIn, baseOut) {
        var j,
          arr = [0],
          arrL,
          i = 0,
          strL = str.length;

        for (; i < strL;) {
          for (arrL = arr.length; arrL--;) arr[arrL] *= baseIn;
          arr[0] += NUMERALS.indexOf(str.charAt(i++));
          for (j = 0; j < arr.length; j++) {
            if (arr[j] > baseOut - 1) {
              if (arr[j + 1] === void 0) arr[j + 1] = 0;
              arr[j + 1] += arr[j] / baseOut | 0;
              arr[j] %= baseOut;
            }
          }
        }

        return arr.reverse();
      }


      /*
       * cos(x) = 1 - x^2/2! + x^4/4! - ...
       * |x| < pi/2
       *
       */
      function cosine(Ctor, x) {
        var k, len, y;

        if (x.isZero()) return x;

        // Argument reduction: cos(4x) = 8*(cos^4(x) - cos^2(x)) + 1
        // i.e. cos(x) = 8*(cos^4(x/4) - cos^2(x/4)) + 1

        // Estimate the optimum number of times to use the argument reduction.
        len = x.d.length;
        if (len < 32) {
          k = Math.ceil(len / 3);
          y = (1 / tinyPow(4, k)).toString();
        } else {
          k = 16;
          y = '2.3283064365386962890625e-10';
        }

        Ctor.precision += k;

        x = taylorSeries(Ctor, 1, x.times(y), new Ctor(1));

        // Reverse argument reduction
        for (var i = k; i--;) {
          var cos2x = x.times(x);
          x = cos2x.times(cos2x).minus(cos2x).times(8).plus(1);
        }

        Ctor.precision -= k;

        return x;
      }


      /*
       * Perform division in the specified base.
       */
      var divide = (function () {

        // Assumes non-zero x and k, and hence non-zero result.
        function multiplyInteger(x, k, base) {
          var temp,
            carry = 0,
            i = x.length;

          for (x = x.slice(); i--;) {
            temp = x[i] * k + carry;
            x[i] = temp % base | 0;
            carry = temp / base | 0;
          }

          if (carry) x.unshift(carry);

          return x;
        }

        function compare(a, b, aL, bL) {
          var i, r;

          if (aL != bL) {
            r = aL > bL ? 1 : -1;
          } else {
            for (i = r = 0; i < aL; i++) {
              if (a[i] != b[i]) {
                r = a[i] > b[i] ? 1 : -1;
                break;
              }
            }
          }

          return r;
        }

        function subtract(a, b, aL, base) {
          var i = 0;

          // Subtract b from a.
          for (; aL--;) {
            a[aL] -= i;
            i = a[aL] < b[aL] ? 1 : 0;
            a[aL] = i * base + a[aL] - b[aL];
          }

          // Remove leading zeros.
          for (; !a[0] && a.length > 1;) a.shift();
        }

        return function (x, y, pr, rm, dp, base) {
          var cmp, e, i, k, logBase, more, prod, prodL, q, qd, rem, remL, rem0, sd, t, xi, xL, yd0,
            yL, yz,
            Ctor = x.constructor,
            sign = x.s == y.s ? 1 : -1,
            xd = x.d,
            yd = y.d;

          // Either NaN, Infinity or 0?
          if (!xd || !xd[0] || !yd || !yd[0]) {

            return new Ctor(// Return NaN if either NaN, or both Infinity or 0.
              !x.s || !y.s || (xd ? yd && xd[0] == yd[0] : !yd) ? NaN :

              // Return ±0 if x is 0 or y is ±Infinity, or return ±Infinity as y is 0.
              xd && xd[0] == 0 || !yd ? sign * 0 : sign / 0);
          }

          if (base) {
            logBase = 1;
            e = x.e - y.e;
          } else {
            base = BASE;
            logBase = LOG_BASE;
            e = mathfloor(x.e / logBase) - mathfloor(y.e / logBase);
          }

          yL = yd.length;
          xL = xd.length;
          q = new Ctor(sign);
          qd = q.d = [];

          // Result exponent may be one less than e.
          // The digit array of a Decimal from toStringBinary may have trailing zeros.
          for (i = 0; yd[i] == (xd[i] || 0); i++);

          if (yd[i] > (xd[i] || 0)) e--;

          if (pr == null) {
            sd = pr = Ctor.precision;
            rm = Ctor.rounding;
          } else if (dp) {
            sd = pr + (x.e - y.e) + 1;
          } else {
            sd = pr;
          }

          if (sd < 0) {
            qd.push(1);
            more = true;
          } else {

            // Convert precision in number of base 10 digits to base 1e7 digits.
            sd = sd / logBase + 2 | 0;
            i = 0;

            // divisor < 1e7
            if (yL == 1) {
              k = 0;
              yd = yd[0];
              sd++;

              // k is the carry.
              for (; (i < xL || k) && sd--; i++) {
                t = k * base + (xd[i] || 0);
                qd[i] = t / yd | 0;
                k = t % yd | 0;
              }

              more = k || i < xL;

            // divisor >= 1e7
            } else {

              // Normalise xd and yd so highest order digit of yd is >= base/2
              k = base / (yd[0] + 1) | 0;

              if (k > 1) {
                yd = multiplyInteger(yd, k, base);
                xd = multiplyInteger(xd, k, base);
                yL = yd.length;
                xL = xd.length;
              }

              xi = yL;
              rem = xd.slice(0, yL);
              remL = rem.length;

              // Add zeros to make remainder as long as divisor.
              for (; remL < yL;) rem[remL++] = 0;

              yz = yd.slice();
              yz.unshift(0);
              yd0 = yd[0];

              if (yd[1] >= base / 2) ++yd0;

              do {
                k = 0;

                // Compare divisor and remainder.
                cmp = compare(yd, rem, yL, remL);

                // If divisor < remainder.
                if (cmp < 0) {

                  // Calculate trial digit, k.
                  rem0 = rem[0];
                  if (yL != remL) rem0 = rem0 * base + (rem[1] || 0);

                  // k will be how many times the divisor goes into the current remainder.
                  k = rem0 / yd0 | 0;

                  //  Algorithm:
                  //  1. product = divisor * trial digit (k)
                  //  2. if product > remainder: product -= divisor, k--
                  //  3. remainder -= product
                  //  4. if product was < remainder at 2:
                  //    5. compare new remainder and divisor
                  //    6. If remainder > divisor: remainder -= divisor, k++

                  if (k > 1) {
                    if (k >= base) k = base - 1;

                    // product = divisor * trial digit.
                    prod = multiplyInteger(yd, k, base);
                    prodL = prod.length;
                    remL = rem.length;

                    // Compare product and remainder.
                    cmp = compare(prod, rem, prodL, remL);

                    // product > remainder.
                    if (cmp == 1) {
                      k--;

                      // Subtract divisor from product.
                      subtract(prod, yL < prodL ? yz : yd, prodL, base);
                    }
                  } else {

                    // cmp is -1.
                    // If k is 0, there is no need to compare yd and rem again below, so change cmp to 1
                    // to avoid it. If k is 1 there is a need to compare yd and rem again below.
                    if (k == 0) cmp = k = 1;
                    prod = yd.slice();
                  }

                  prodL = prod.length;
                  if (prodL < remL) prod.unshift(0);

                  // Subtract product from remainder.
                  subtract(rem, prod, remL, base);

                  // If product was < previous remainder.
                  if (cmp == -1) {
                    remL = rem.length;

                    // Compare divisor and new remainder.
                    cmp = compare(yd, rem, yL, remL);

                    // If divisor < new remainder, subtract divisor from remainder.
                    if (cmp < 1) {
                      k++;

                      // Subtract divisor from remainder.
                      subtract(rem, yL < remL ? yz : yd, remL, base);
                    }
                  }

                  remL = rem.length;
                } else if (cmp === 0) {
                  k++;
                  rem = [0];
                }    // if cmp === 1, k will be 0

                // Add the next digit, k, to the result array.
                qd[i++] = k;

                // Update the remainder.
                if (cmp && rem[0]) {
                  rem[remL++] = xd[xi] || 0;
                } else {
                  rem = [xd[xi]];
                  remL = 1;
                }

              } while ((xi++ < xL || rem[0] !== void 0) && sd--);

              more = rem[0] !== void 0;
            }

            // Leading zero?
            if (!qd[0]) qd.shift();
          }

          // logBase is 1 when divide is being used for base conversion.
          if (logBase == 1) {
            q.e = e;
            inexact = more;
          } else {

            // To calculate q.e, first get the number of digits of qd[0].
            for (i = 1, k = qd[0]; k >= 10; k /= 10) i++;
            q.e = i + e * logBase - 1;

            finalise(q, dp ? pr + q.e + 1 : pr, rm, more);
          }

          return q;
        };
      })();


      /*
       * Round `x` to `sd` significant digits using rounding mode `rm`.
       * Check for over/under-flow.
       */
       function finalise(x, sd, rm, isTruncated) {
        var digits, i, j, k, rd, roundUp, w, xd, xdi,
          Ctor = x.constructor;

        // Don't round if sd is null or undefined.
        out: if (sd != null) {
          xd = x.d;

          // Infinity/NaN.
          if (!xd) return x;

          // rd: the rounding digit, i.e. the digit after the digit that may be rounded up.
          // w: the word of xd containing rd, a base 1e7 number.
          // xdi: the index of w within xd.
          // digits: the number of digits of w.
          // i: what would be the index of rd within w if all the numbers were 7 digits long (i.e. if
          // they had leading zeros)
          // j: if > 0, the actual index of rd within w (if < 0, rd is a leading zero).

          // Get the length of the first word of the digits array xd.
          for (digits = 1, k = xd[0]; k >= 10; k /= 10) digits++;
          i = sd - digits;

          // Is the rounding digit in the first word of xd?
          if (i < 0) {
            i += LOG_BASE;
            j = sd;
            w = xd[xdi = 0];

            // Get the rounding digit at index j of w.
            rd = w / mathpow(10, digits - j - 1) % 10 | 0;
          } else {
            xdi = Math.ceil((i + 1) / LOG_BASE);
            k = xd.length;
            if (xdi >= k) {
              if (isTruncated) {

                // Needed by `naturalExponential`, `naturalLogarithm` and `squareRoot`.
                for (; k++ <= xdi;) xd.push(0);
                w = rd = 0;
                digits = 1;
                i %= LOG_BASE;
                j = i - LOG_BASE + 1;
              } else {
                break out;
              }
            } else {
              w = k = xd[xdi];

              // Get the number of digits of w.
              for (digits = 1; k >= 10; k /= 10) digits++;

              // Get the index of rd within w.
              i %= LOG_BASE;

              // Get the index of rd within w, adjusted for leading zeros.
              // The number of leading zeros of w is given by LOG_BASE - digits.
              j = i - LOG_BASE + digits;

              // Get the rounding digit at index j of w.
              rd = j < 0 ? 0 : w / mathpow(10, digits - j - 1) % 10 | 0;
            }
          }

          // Are there any non-zero digits after the rounding digit?
          isTruncated = isTruncated || sd < 0 ||
            xd[xdi + 1] !== void 0 || (j < 0 ? w : w % mathpow(10, digits - j - 1));

          // The expression `w % mathpow(10, digits - j - 1)` returns all the digits of w to the right
          // of the digit at (left-to-right) index j, e.g. if w is 908714 and j is 2, the expression
          // will give 714.

          roundUp = rm < 4
            ? (rd || isTruncated) && (rm == 0 || rm == (x.s < 0 ? 3 : 2))
            : rd > 5 || rd == 5 && (rm == 4 || isTruncated || rm == 6 &&

              // Check whether the digit to the left of the rounding digit is odd.
              ((i > 0 ? j > 0 ? w / mathpow(10, digits - j) : 0 : xd[xdi - 1]) % 10) & 1 ||
                rm == (x.s < 0 ? 8 : 7));

          if (sd < 1 || !xd[0]) {
            xd.length = 0;
            if (roundUp) {

              // Convert sd to decimal places.
              sd -= x.e + 1;

              // 1, 0.1, 0.01, 0.001, 0.0001 etc.
              xd[0] = mathpow(10, (LOG_BASE - sd % LOG_BASE) % LOG_BASE);
              x.e = -sd || 0;
            } else {

              // Zero.
              xd[0] = x.e = 0;
            }

            return x;
          }

          // Remove excess digits.
          if (i == 0) {
            xd.length = xdi;
            k = 1;
            xdi--;
          } else {
            xd.length = xdi + 1;
            k = mathpow(10, LOG_BASE - i);

            // E.g. 56700 becomes 56000 if 7 is the rounding digit.
            // j > 0 means i > number of leading zeros of w.
            xd[xdi] = j > 0 ? (w / mathpow(10, digits - j) % mathpow(10, j) | 0) * k : 0;
          }

          if (roundUp) {
            for (;;) {

              // Is the digit to be rounded up in the first word of xd?
              if (xdi == 0) {

                // i will be the length of xd[0] before k is added.
                for (i = 1, j = xd[0]; j >= 10; j /= 10) i++;
                j = xd[0] += k;
                for (k = 1; j >= 10; j /= 10) k++;

                // if i != k the length has increased.
                if (i != k) {
                  x.e++;
                  if (xd[0] == BASE) xd[0] = 1;
                }

                break;
              } else {
                xd[xdi] += k;
                if (xd[xdi] != BASE) break;
                xd[xdi--] = 0;
                k = 1;
              }
            }
          }

          // Remove trailing zeros.
          for (i = xd.length; xd[--i] === 0;) xd.pop();
        }

        if (external) {

          // Overflow?
          if (x.e > Ctor.maxE) {

            // Infinity.
            x.d = null;
            x.e = NaN;

          // Underflow?
          } else if (x.e < Ctor.minE) {

            // Zero.
            x.e = 0;
            x.d = [0];
            // Ctor.underflow = true;
          } // else Ctor.underflow = false;
        }

        return x;
      }


      function finiteToString(x, isExp, sd) {
        if (!x.isFinite()) return nonFiniteToString(x);
        var k,
          e = x.e,
          str = digitsToString(x.d),
          len = str.length;

        if (isExp) {
          if (sd && (k = sd - len) > 0) {
            str = str.charAt(0) + '.' + str.slice(1) + getZeroString(k);
          } else if (len > 1) {
            str = str.charAt(0) + '.' + str.slice(1);
          }

          str = str + (x.e < 0 ? 'e' : 'e+') + x.e;
        } else if (e < 0) {
          str = '0.' + getZeroString(-e - 1) + str;
          if (sd && (k = sd - len) > 0) str += getZeroString(k);
        } else if (e >= len) {
          str += getZeroString(e + 1 - len);
          if (sd && (k = sd - e - 1) > 0) str = str + '.' + getZeroString(k);
        } else {
          if ((k = e + 1) < len) str = str.slice(0, k) + '.' + str.slice(k);
          if (sd && (k = sd - len) > 0) {
            if (e + 1 === len) str += '.';
            str += getZeroString(k);
          }
        }

        return str;
      }


      // Calculate the base 10 exponent from the base 1e7 exponent.
      function getBase10Exponent(digits, e) {
        var w = digits[0];

        // Add the number of digits of the first word of the digits array.
        for ( e *= LOG_BASE; w >= 10; w /= 10) e++;
        return e;
      }


      function getLn10(Ctor, sd, pr) {
        if (sd > LN10_PRECISION) {

          // Reset global state in case the exception is caught.
          external = true;
          if (pr) Ctor.precision = pr;
          throw Error(precisionLimitExceeded);
        }
        return finalise(new Ctor(LN10), sd, 1, true);
      }


      function getPi(Ctor, sd, rm) {
        if (sd > PI_PRECISION) throw Error(precisionLimitExceeded);
        return finalise(new Ctor(PI), sd, rm, true);
      }


      function getPrecision(digits) {
        var w = digits.length - 1,
          len = w * LOG_BASE + 1;

        w = digits[w];

        // If non-zero...
        if (w) {

          // Subtract the number of trailing zeros of the last word.
          for (; w % 10 == 0; w /= 10) len--;

          // Add the number of digits of the first word.
          for (w = digits[0]; w >= 10; w /= 10) len++;
        }

        return len;
      }


      function getZeroString(k) {
        var zs = '';
        for (; k--;) zs += '0';
        return zs;
      }


      /*
       * Return a new Decimal whose value is the value of Decimal `x` to the power `n`, where `n` is an
       * integer of type number.
       *
       * Implements 'exponentiation by squaring'. Called by `pow` and `parseOther`.
       *
       */
      function intPow(Ctor, x, n, pr) {
        var isTruncated,
          r = new Ctor(1),

          // Max n of 9007199254740991 takes 53 loop iterations.
          // Maximum digits array length; leaves [28, 34] guard digits.
          k = Math.ceil(pr / LOG_BASE + 4);

        external = false;

        for (;;) {
          if (n % 2) {
            r = r.times(x);
            if (truncate(r.d, k)) isTruncated = true;
          }

          n = mathfloor(n / 2);
          if (n === 0) {

            // To ensure correct rounding when r.d is truncated, increment the last word if it is zero.
            n = r.d.length - 1;
            if (isTruncated && r.d[n] === 0) ++r.d[n];
            break;
          }

          x = x.times(x);
          truncate(x.d, k);
        }

        external = true;

        return r;
      }


      function isOdd(n) {
        return n.d[n.d.length - 1] & 1;
      }


      /*
       * Handle `max` and `min`. `ltgt` is 'lt' or 'gt'.
       */
      function maxOrMin(Ctor, args, ltgt) {
        var y,
          x = new Ctor(args[0]),
          i = 0;

        for (; ++i < args.length;) {
          y = new Ctor(args[i]);
          if (!y.s) {
            x = y;
            break;
          } else if (x[ltgt](y)) {
            x = y;
          }
        }

        return x;
      }


      /*
       * Return a new Decimal whose value is the natural exponential of `x` rounded to `sd` significant
       * digits.
       *
       * Taylor/Maclaurin series.
       *
       * exp(x) = x^0/0! + x^1/1! + x^2/2! + x^3/3! + ...
       *
       * Argument reduction:
       *   Repeat x = x / 32, k += 5, until |x| < 0.1
       *   exp(x) = exp(x / 2^k)^(2^k)
       *
       * Previously, the argument was initially reduced by
       * exp(x) = exp(r) * 10^k  where r = x - k * ln10, k = floor(x / ln10)
       * to first put r in the range [0, ln10], before dividing by 32 until |x| < 0.1, but this was
       * found to be slower than just dividing repeatedly by 32 as above.
       *
       * Max integer argument: exp('20723265836946413') = 6.3e+9000000000000000
       * Min integer argument: exp('-20723265836946411') = 1.2e-9000000000000000
       * (Math object integer min/max: Math.exp(709) = 8.2e+307, Math.exp(-745) = 5e-324)
       *
       *  exp(Infinity)  = Infinity
       *  exp(-Infinity) = 0
       *  exp(NaN)       = NaN
       *  exp(±0)        = 1
       *
       *  exp(x) is non-terminating for any finite, non-zero x.
       *
       *  The result will always be correctly rounded.
       *
       */
      function naturalExponential(x, sd) {
        var denominator, guard, j, pow, sum, t, wpr,
          rep = 0,
          i = 0,
          k = 0,
          Ctor = x.constructor,
          rm = Ctor.rounding,
          pr = Ctor.precision;

        // 0/NaN/Infinity?
        if (!x.d || !x.d[0] || x.e > 17) {

          return new Ctor(x.d
            ? !x.d[0] ? 1 : x.s < 0 ? 0 : 1 / 0
            : x.s ? x.s < 0 ? 0 : x : 0 / 0);
        }

        if (sd == null) {
          external = false;
          wpr = pr;
        } else {
          wpr = sd;
        }

        t = new Ctor(0.03125);

        // while abs(x) >= 0.1
        while (x.e > -2) {

          // x = x / 2^5
          x = x.times(t);
          k += 5;
        }

        // Use 2 * log10(2^k) + 5 (empirically derived) to estimate the increase in precision
        // necessary to ensure the first 4 rounding digits are correct.
        guard = Math.log(mathpow(2, k)) / Math.LN10 * 2 + 5 | 0;
        wpr += guard;
        denominator = pow = sum = new Ctor(1);
        Ctor.precision = wpr;

        for (;;) {
          pow = finalise(pow.times(x), wpr, 1);
          denominator = denominator.times(++i);
          t = sum.plus(divide(pow, denominator, wpr, 1));

          if (digitsToString(t.d).slice(0, wpr) === digitsToString(sum.d).slice(0, wpr)) {
            j = k;
            while (j--) sum = finalise(sum.times(sum), wpr, 1);

            // Check to see if the first 4 rounding digits are [49]999.
            // If so, repeat the summation with a higher precision, otherwise
            // e.g. with precision: 18, rounding: 1
            // exp(18.404272462595034083567793919843761) = 98372560.1229999999 (should be 98372560.123)
            // `wpr - guard` is the index of first rounding digit.
            if (sd == null) {

              if (rep < 3 && checkRoundingDigits(sum.d, wpr - guard, rm, rep)) {
                Ctor.precision = wpr += 10;
                denominator = pow = t = new Ctor(1);
                i = 0;
                rep++;
              } else {
                return finalise(sum, Ctor.precision = pr, rm, external = true);
              }
            } else {
              Ctor.precision = pr;
              return sum;
            }
          }

          sum = t;
        }
      }


      /*
       * Return a new Decimal whose value is the natural logarithm of `x` rounded to `sd` significant
       * digits.
       *
       *  ln(-n)        = NaN
       *  ln(0)         = -Infinity
       *  ln(-0)        = -Infinity
       *  ln(1)         = 0
       *  ln(Infinity)  = Infinity
       *  ln(-Infinity) = NaN
       *  ln(NaN)       = NaN
       *
       *  ln(n) (n != 1) is non-terminating.
       *
       */
      function naturalLogarithm(y, sd) {
        var c, c0, denominator, e, numerator, rep, sum, t, wpr, x1, x2,
          n = 1,
          guard = 10,
          x = y,
          xd = x.d,
          Ctor = x.constructor,
          rm = Ctor.rounding,
          pr = Ctor.precision;

        // Is x negative or Infinity, NaN, 0 or 1?
        if (x.s < 0 || !xd || !xd[0] || !x.e && xd[0] == 1 && xd.length == 1) {
          return new Ctor(xd && !xd[0] ? -1 / 0 : x.s != 1 ? NaN : xd ? 0 : x);
        }

        if (sd == null) {
          external = false;
          wpr = pr;
        } else {
          wpr = sd;
        }

        Ctor.precision = wpr += guard;
        c = digitsToString(xd);
        c0 = c.charAt(0);

        if (Math.abs(e = x.e) < 1.5e15) {

          // Argument reduction.
          // The series converges faster the closer the argument is to 1, so using
          // ln(a^b) = b * ln(a),   ln(a) = ln(a^b) / b
          // multiply the argument by itself until the leading digits of the significand are 7, 8, 9,
          // 10, 11, 12 or 13, recording the number of multiplications so the sum of the series can
          // later be divided by this number, then separate out the power of 10 using
          // ln(a*10^b) = ln(a) + b*ln(10).

          // max n is 21 (gives 0.9, 1.0 or 1.1) (9e15 / 21 = 4.2e14).
          //while (c0 < 9 && c0 != 1 || c0 == 1 && c.charAt(1) > 1) {
          // max n is 6 (gives 0.7 - 1.3)
          while (c0 < 7 && c0 != 1 || c0 == 1 && c.charAt(1) > 3) {
            x = x.times(y);
            c = digitsToString(x.d);
            c0 = c.charAt(0);
            n++;
          }

          e = x.e;

          if (c0 > 1) {
            x = new Ctor('0.' + c);
            e++;
          } else {
            x = new Ctor(c0 + '.' + c.slice(1));
          }
        } else {

          // The argument reduction method above may result in overflow if the argument y is a massive
          // number with exponent >= 1500000000000000 (9e15 / 6 = 1.5e15), so instead recall this
          // function using ln(x*10^e) = ln(x) + e*ln(10).
          t = getLn10(Ctor, wpr + 2, pr).times(e + '');
          x = naturalLogarithm(new Ctor(c0 + '.' + c.slice(1)), wpr - guard).plus(t);
          Ctor.precision = pr;

          return sd == null ? finalise(x, pr, rm, external = true) : x;
        }

        // x1 is x reduced to a value near 1.
        x1 = x;

        // Taylor series.
        // ln(y) = ln((1 + x)/(1 - x)) = 2(x + x^3/3 + x^5/5 + x^7/7 + ...)
        // where x = (y - 1)/(y + 1)    (|x| < 1)
        sum = numerator = x = divide(x.minus(1), x.plus(1), wpr, 1);
        x2 = finalise(x.times(x), wpr, 1);
        denominator = 3;

        for (;;) {
          numerator = finalise(numerator.times(x2), wpr, 1);
          t = sum.plus(divide(numerator, new Ctor(denominator), wpr, 1));

          if (digitsToString(t.d).slice(0, wpr) === digitsToString(sum.d).slice(0, wpr)) {
            sum = sum.times(2);

            // Reverse the argument reduction. Check that e is not 0 because, besides preventing an
            // unnecessary calculation, -0 + 0 = +0 and to ensure correct rounding -0 needs to stay -0.
            if (e !== 0) sum = sum.plus(getLn10(Ctor, wpr + 2, pr).times(e + ''));
            sum = divide(sum, new Ctor(n), wpr, 1);

            // Is rm > 3 and the first 4 rounding digits 4999, or rm < 4 (or the summation has
            // been repeated previously) and the first 4 rounding digits 9999?
            // If so, restart the summation with a higher precision, otherwise
            // e.g. with precision: 12, rounding: 1
            // ln(135520028.6126091714265381533) = 18.7246299999 when it should be 18.72463.
            // `wpr - guard` is the index of first rounding digit.
            if (sd == null) {
              if (checkRoundingDigits(sum.d, wpr - guard, rm, rep)) {
                Ctor.precision = wpr += guard;
                t = numerator = x = divide(x1.minus(1), x1.plus(1), wpr, 1);
                x2 = finalise(x.times(x), wpr, 1);
                denominator = rep = 1;
              } else {
                return finalise(sum, Ctor.precision = pr, rm, external = true);
              }
            } else {
              Ctor.precision = pr;
              return sum;
            }
          }

          sum = t;
          denominator += 2;
        }
      }


      // ±Infinity, NaN.
      function nonFiniteToString(x) {
        // Unsigned.
        return String(x.s * x.s / 0);
      }


      /*
       * Parse the value of a new Decimal `x` from string `str`.
       */
      function parseDecimal(x, str) {
        var e, i, len;

        // Decimal point?
        if ((e = str.indexOf('.')) > -1) str = str.replace('.', '');

        // Exponential form?
        if ((i = str.search(/e/i)) > 0) {

          // Determine exponent.
          if (e < 0) e = i;
          e += +str.slice(i + 1);
          str = str.substring(0, i);
        } else if (e < 0) {

          // Integer.
          e = str.length;
        }

        // Determine leading zeros.
        for (i = 0; str.charCodeAt(i) === 48; i++);

        // Determine trailing zeros.
        for (len = str.length; str.charCodeAt(len - 1) === 48; --len);
        str = str.slice(i, len);

        if (str) {
          len -= i;
          x.e = e = e - i - 1;
          x.d = [];

          // Transform base

          // e is the base 10 exponent.
          // i is where to slice str to get the first word of the digits array.
          i = (e + 1) % LOG_BASE;
          if (e < 0) i += LOG_BASE;

          if (i < len) {
            if (i) x.d.push(+str.slice(0, i));
            for (len -= LOG_BASE; i < len;) x.d.push(+str.slice(i, i += LOG_BASE));
            str = str.slice(i);
            i = LOG_BASE - str.length;
          } else {
            i -= len;
          }

          for (; i--;) str += '0';
          x.d.push(+str);

          if (external) {

            // Overflow?
            if (x.e > x.constructor.maxE) {

              // Infinity.
              x.d = null;
              x.e = NaN;

            // Underflow?
            } else if (x.e < x.constructor.minE) {

              // Zero.
              x.e = 0;
              x.d = [0];
              // x.constructor.underflow = true;
            } // else x.constructor.underflow = false;
          }
        } else {

          // Zero.
          x.e = 0;
          x.d = [0];
        }

        return x;
      }


      /*
       * Parse the value of a new Decimal `x` from a string `str`, which is not a decimal value.
       */
      function parseOther(x, str) {
        var base, Ctor, divisor, i, isFloat, len, p, xd, xe;

        if (str.indexOf('_') > -1) {
          str = str.replace(/(\d)_(?=\d)/g, '$1');
          if (isDecimal.test(str)) return parseDecimal(x, str);
        } else if (str === 'Infinity' || str === 'NaN') {
          if (!+str) x.s = NaN;
          x.e = NaN;
          x.d = null;
          return x;
        }

        if (isHex.test(str))  {
          base = 16;
          str = str.toLowerCase();
        } else if (isBinary.test(str))  {
          base = 2;
        } else if (isOctal.test(str))  {
          base = 8;
        } else {
          throw Error(invalidArgument + str);
        }

        // Is there a binary exponent part?
        i = str.search(/p/i);

        if (i > 0) {
          p = +str.slice(i + 1);
          str = str.substring(2, i);
        } else {
          str = str.slice(2);
        }

        // Convert `str` as an integer then divide the result by `base` raised to a power such that the
        // fraction part will be restored.
        i = str.indexOf('.');
        isFloat = i >= 0;
        Ctor = x.constructor;

        if (isFloat) {
          str = str.replace('.', '');
          len = str.length;
          i = len - i;

          // log[10](16) = 1.2041... , log[10](88) = 1.9444....
          divisor = intPow(Ctor, new Ctor(base), i, i * 2);
        }

        xd = convertBase(str, base, BASE);
        xe = xd.length - 1;

        // Remove trailing zeros.
        for (i = xe; xd[i] === 0; --i) xd.pop();
        if (i < 0) return new Ctor(x.s * 0);
        x.e = getBase10Exponent(xd, xe);
        x.d = xd;
        external = false;

        // At what precision to perform the division to ensure exact conversion?
        // maxDecimalIntegerPartDigitCount = ceil(log[10](b) * otherBaseIntegerPartDigitCount)
        // log[10](2) = 0.30103, log[10](8) = 0.90309, log[10](16) = 1.20412
        // E.g. ceil(1.2 * 3) = 4, so up to 4 decimal digits are needed to represent 3 hex int digits.
        // maxDecimalFractionPartDigitCount = {Hex:4|Oct:3|Bin:1} * otherBaseFractionPartDigitCount
        // Therefore using 4 * the number of digits of str will always be enough.
        if (isFloat) x = divide(x, divisor, len * 4);

        // Multiply by the binary exponent part if present.
        if (p) x = x.times(Math.abs(p) < 54 ? mathpow(2, p) : Decimal.pow(2, p));
        external = true;

        return x;
      }


      /*
       * sin(x) = x - x^3/3! + x^5/5! - ...
       * |x| < pi/2
       *
       */
      function sine(Ctor, x) {
        var k,
          len = x.d.length;

        if (len < 3) {
          return x.isZero() ? x : taylorSeries(Ctor, 2, x, x);
        }

        // Argument reduction: sin(5x) = 16*sin^5(x) - 20*sin^3(x) + 5*sin(x)
        // i.e. sin(x) = 16*sin^5(x/5) - 20*sin^3(x/5) + 5*sin(x/5)
        // and  sin(x) = sin(x/5)(5 + sin^2(x/5)(16sin^2(x/5) - 20))

        // Estimate the optimum number of times to use the argument reduction.
        k = 1.4 * Math.sqrt(len);
        k = k > 16 ? 16 : k | 0;

        x = x.times(1 / tinyPow(5, k));
        x = taylorSeries(Ctor, 2, x, x);

        // Reverse argument reduction
        var sin2_x,
          d5 = new Ctor(5),
          d16 = new Ctor(16),
          d20 = new Ctor(20);
        for (; k--;) {
          sin2_x = x.times(x);
          x = x.times(d5.plus(sin2_x.times(d16.times(sin2_x).minus(d20))));
        }

        return x;
      }


      // Calculate Taylor series for `cos`, `cosh`, `sin` and `sinh`.
      function taylorSeries(Ctor, n, x, y, isHyperbolic) {
        var j, t, u, x2,
          pr = Ctor.precision,
          k = Math.ceil(pr / LOG_BASE);

        external = false;
        x2 = x.times(x);
        u = new Ctor(y);

        for (;;) {
          t = divide(u.times(x2), new Ctor(n++ * n++), pr, 1);
          u = isHyperbolic ? y.plus(t) : y.minus(t);
          y = divide(t.times(x2), new Ctor(n++ * n++), pr, 1);
          t = u.plus(y);

          if (t.d[k] !== void 0) {
            for (j = k; t.d[j] === u.d[j] && j--;);
            if (j == -1) break;
          }

          j = u;
          u = y;
          y = t;
          t = j;
        }

        external = true;
        t.d.length = k + 1;

        return t;
      }


      // Exponent e must be positive and non-zero.
      function tinyPow(b, e) {
        var n = b;
        while (--e) n *= b;
        return n;
      }


      // Return the absolute value of `x` reduced to less than or equal to half pi.
      function toLessThanHalfPi(Ctor, x) {
        var t,
          isNeg = x.s < 0,
          pi = getPi(Ctor, Ctor.precision, 1),
          halfPi = pi.times(0.5);

        x = x.abs();

        if (x.lte(halfPi)) {
          quadrant = isNeg ? 4 : 1;
          return x;
        }

        t = x.divToInt(pi);

        if (t.isZero()) {
          quadrant = isNeg ? 3 : 2;
        } else {
          x = x.minus(t.times(pi));

          // 0 <= x < pi
          if (x.lte(halfPi)) {
            quadrant = isOdd(t) ? (isNeg ? 2 : 3) : (isNeg ? 4 : 1);
            return x;
          }

          quadrant = isOdd(t) ? (isNeg ? 1 : 4) : (isNeg ? 3 : 2);
        }

        return x.minus(pi).abs();
      }


      /*
       * Return the value of Decimal `x` as a string in base `baseOut`.
       *
       * If the optional `sd` argument is present include a binary exponent suffix.
       */
      function toStringBinary(x, baseOut, sd, rm) {
        var base, e, i, k, len, roundUp, str, xd, y,
          Ctor = x.constructor,
          isExp = sd !== void 0;

        if (isExp) {
          checkInt32(sd, 1, MAX_DIGITS);
          if (rm === void 0) rm = Ctor.rounding;
          else checkInt32(rm, 0, 8);
        } else {
          sd = Ctor.precision;
          rm = Ctor.rounding;
        }

        if (!x.isFinite()) {
          str = nonFiniteToString(x);
        } else {
          str = finiteToString(x);
          i = str.indexOf('.');

          // Use exponential notation according to `toExpPos` and `toExpNeg`? No, but if required:
          // maxBinaryExponent = floor((decimalExponent + 1) * log[2](10))
          // minBinaryExponent = floor(decimalExponent * log[2](10))
          // log[2](10) = 3.321928094887362347870319429489390175864

          if (isExp) {
            base = 2;
            if (baseOut == 16) {
              sd = sd * 4 - 3;
            } else if (baseOut == 8) {
              sd = sd * 3 - 2;
            }
          } else {
            base = baseOut;
          }

          // Convert the number as an integer then divide the result by its base raised to a power such
          // that the fraction part will be restored.

          // Non-integer.
          if (i >= 0) {
            str = str.replace('.', '');
            y = new Ctor(1);
            y.e = str.length - i;
            y.d = convertBase(finiteToString(y), 10, base);
            y.e = y.d.length;
          }

          xd = convertBase(str, 10, base);
          e = len = xd.length;

          // Remove trailing zeros.
          for (; xd[--len] == 0;) xd.pop();

          if (!xd[0]) {
            str = isExp ? '0p+0' : '0';
          } else {
            if (i < 0) {
              e--;
            } else {
              x = new Ctor(x);
              x.d = xd;
              x.e = e;
              x = divide(x, y, sd, rm, 0, base);
              xd = x.d;
              e = x.e;
              roundUp = inexact;
            }

            // The rounding digit, i.e. the digit after the digit that may be rounded up.
            i = xd[sd];
            k = base / 2;
            roundUp = roundUp || xd[sd + 1] !== void 0;

            roundUp = rm < 4
              ? (i !== void 0 || roundUp) && (rm === 0 || rm === (x.s < 0 ? 3 : 2))
              : i > k || i === k && (rm === 4 || roundUp || rm === 6 && xd[sd - 1] & 1 ||
                rm === (x.s < 0 ? 8 : 7));

            xd.length = sd;

            if (roundUp) {

              // Rounding up may mean the previous digit has to be rounded up and so on.
              for (; ++xd[--sd] > base - 1;) {
                xd[sd] = 0;
                if (!sd) {
                  ++e;
                  xd.unshift(1);
                }
              }
            }

            // Determine trailing zeros.
            for (len = xd.length; !xd[len - 1]; --len);

            // E.g. [4, 11, 15] becomes 4bf.
            for (i = 0, str = ''; i < len; i++) str += NUMERALS.charAt(xd[i]);

            // Add binary exponent suffix?
            if (isExp) {
              if (len > 1) {
                if (baseOut == 16 || baseOut == 8) {
                  i = baseOut == 16 ? 4 : 3;
                  for (--len; len % i; len++) str += '0';
                  xd = convertBase(str, base, baseOut);
                  for (len = xd.length; !xd[len - 1]; --len);

                  // xd[0] will always be be 1
                  for (i = 1, str = '1.'; i < len; i++) str += NUMERALS.charAt(xd[i]);
                } else {
                  str = str.charAt(0) + '.' + str.slice(1);
                }
              }

              str =  str + (e < 0 ? 'p' : 'p+') + e;
            } else if (e < 0) {
              for (; ++e;) str = '0' + str;
              str = '0.' + str;
            } else {
              if (++e > len) for (e -= len; e-- ;) str += '0';
              else if (e < len) str = str.slice(0, e) + '.' + str.slice(e);
            }
          }

          str = (baseOut == 16 ? '0x' : baseOut == 2 ? '0b' : baseOut == 8 ? '0o' : '') + str;
        }

        return x.s < 0 ? '-' + str : str;
      }


      // Does not strip trailing zeros.
      function truncate(arr, len) {
        if (arr.length > len) {
          arr.length = len;
          return true;
        }
      }


      // Decimal methods


      /*
       *  abs
       *  acos
       *  acosh
       *  add
       *  asin
       *  asinh
       *  atan
       *  atanh
       *  atan2
       *  cbrt
       *  ceil
       *  clamp
       *  clone
       *  config
       *  cos
       *  cosh
       *  div
       *  exp
       *  floor
       *  hypot
       *  ln
       *  log
       *  log2
       *  log10
       *  max
       *  min
       *  mod
       *  mul
       *  pow
       *  random
       *  round
       *  set
       *  sign
       *  sin
       *  sinh
       *  sqrt
       *  sub
       *  sum
       *  tan
       *  tanh
       *  trunc
       */


      /*
       * Return a new Decimal whose value is the absolute value of `x`.
       *
       * x {number|string|Decimal}
       *
       */
      function abs(x) {
        return new this(x).abs();
      }


      /*
       * Return a new Decimal whose value is the arccosine in radians of `x`.
       *
       * x {number|string|Decimal}
       *
       */
      function acos(x) {
        return new this(x).acos();
      }


      /*
       * Return a new Decimal whose value is the inverse of the hyperbolic cosine of `x`, rounded to
       * `precision` significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function acosh(x) {
        return new this(x).acosh();
      }


      /*
       * Return a new Decimal whose value is the sum of `x` and `y`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       * y {number|string|Decimal}
       *
       */
      function add(x, y) {
        return new this(x).plus(y);
      }


      /*
       * Return a new Decimal whose value is the arcsine in radians of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       *
       */
      function asin(x) {
        return new this(x).asin();
      }


      /*
       * Return a new Decimal whose value is the inverse of the hyperbolic sine of `x`, rounded to
       * `precision` significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function asinh(x) {
        return new this(x).asinh();
      }


      /*
       * Return a new Decimal whose value is the arctangent in radians of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       *
       */
      function atan(x) {
        return new this(x).atan();
      }


      /*
       * Return a new Decimal whose value is the inverse of the hyperbolic tangent of `x`, rounded to
       * `precision` significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function atanh(x) {
        return new this(x).atanh();
      }


      /*
       * Return a new Decimal whose value is the arctangent in radians of `y/x` in the range -pi to pi
       * (inclusive), rounded to `precision` significant digits using rounding mode `rounding`.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-pi, pi]
       *
       * y {number|string|Decimal} The y-coordinate.
       * x {number|string|Decimal} The x-coordinate.
       *
       * atan2(±0, -0)               = ±pi
       * atan2(±0, +0)               = ±0
       * atan2(±0, -x)               = ±pi for x > 0
       * atan2(±0, x)                = ±0 for x > 0
       * atan2(-y, ±0)               = -pi/2 for y > 0
       * atan2(y, ±0)                = pi/2 for y > 0
       * atan2(±y, -Infinity)        = ±pi for finite y > 0
       * atan2(±y, +Infinity)        = ±0 for finite y > 0
       * atan2(±Infinity, x)         = ±pi/2 for finite x
       * atan2(±Infinity, -Infinity) = ±3*pi/4
       * atan2(±Infinity, +Infinity) = ±pi/4
       * atan2(NaN, x) = NaN
       * atan2(y, NaN) = NaN
       *
       */
      function atan2(y, x) {
        y = new this(y);
        x = new this(x);
        var r,
          pr = this.precision,
          rm = this.rounding,
          wpr = pr + 4;

        // Either NaN
        if (!y.s || !x.s) {
          r = new this(NaN);

        // Both ±Infinity
        } else if (!y.d && !x.d) {
          r = getPi(this, wpr, 1).times(x.s > 0 ? 0.25 : 0.75);
          r.s = y.s;

        // x is ±Infinity or y is ±0
        } else if (!x.d || y.isZero()) {
          r = x.s < 0 ? getPi(this, pr, rm) : new this(0);
          r.s = y.s;

        // y is ±Infinity or x is ±0
        } else if (!y.d || x.isZero()) {
          r = getPi(this, wpr, 1).times(0.5);
          r.s = y.s;

        // Both non-zero and finite
        } else if (x.s < 0) {
          this.precision = wpr;
          this.rounding = 1;
          r = this.atan(divide(y, x, wpr, 1));
          x = getPi(this, wpr, 1);
          this.precision = pr;
          this.rounding = rm;
          r = y.s < 0 ? r.minus(x) : r.plus(x);
        } else {
          r = this.atan(divide(y, x, wpr, 1));
        }

        return r;
      }


      /*
       * Return a new Decimal whose value is the cube root of `x`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       *
       */
      function cbrt(x) {
        return new this(x).cbrt();
      }


      /*
       * Return a new Decimal whose value is `x` rounded to an integer using `ROUND_CEIL`.
       *
       * x {number|string|Decimal}
       *
       */
      function ceil(x) {
        return finalise(x = new this(x), x.e + 1, 2);
      }


      /*
       * Return a new Decimal whose value is `x` clamped to the range delineated by `min` and `max`.
       *
       * x {number|string|Decimal}
       * min {number|string|Decimal}
       * max {number|string|Decimal}
       *
       */
      function clamp(x, min, max) {
        return new this(x).clamp(min, max);
      }


      /*
       * Configure global settings for a Decimal constructor.
       *
       * `obj` is an object with one or more of the following properties,
       *
       *   precision  {number}
       *   rounding   {number}
       *   toExpNeg   {number}
       *   toExpPos   {number}
       *   maxE       {number}
       *   minE       {number}
       *   modulo     {number}
       *   crypto     {boolean|number}
       *   defaults   {true}
       *
       * E.g. Decimal.config({ precision: 20, rounding: 4 })
       *
       */
      function config(obj) {
        if (!obj || typeof obj !== 'object') throw Error(decimalError + 'Object expected');
        var i, p, v,
          useDefaults = obj.defaults === true,
          ps = [
            'precision', 1, MAX_DIGITS,
            'rounding', 0, 8,
            'toExpNeg', -EXP_LIMIT, 0,
            'toExpPos', 0, EXP_LIMIT,
            'maxE', 0, EXP_LIMIT,
            'minE', -EXP_LIMIT, 0,
            'modulo', 0, 9
          ];

        for (i = 0; i < ps.length; i += 3) {
          if (p = ps[i], useDefaults) this[p] = DEFAULTS[p];
          if ((v = obj[p]) !== void 0) {
            if (mathfloor(v) === v && v >= ps[i + 1] && v <= ps[i + 2]) this[p] = v;
            else throw Error(invalidArgument + p + ': ' + v);
          }
        }

        if (p = 'crypto', useDefaults) this[p] = DEFAULTS[p];
        if ((v = obj[p]) !== void 0) {
          if (v === true || v === false || v === 0 || v === 1) {
            if (v) {
              if (typeof crypto != 'undefined' && crypto &&
                (crypto.getRandomValues || crypto.randomBytes)) {
                this[p] = true;
              } else {
                throw Error(cryptoUnavailable);
              }
            } else {
              this[p] = false;
            }
          } else {
            throw Error(invalidArgument + p + ': ' + v);
          }
        }

        return this;
      }


      /*
       * Return a new Decimal whose value is the cosine of `x`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function cos(x) {
        return new this(x).cos();
      }


      /*
       * Return a new Decimal whose value is the hyperbolic cosine of `x`, rounded to precision
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function cosh(x) {
        return new this(x).cosh();
      }


      /*
       * Create and return a Decimal constructor with the same configuration properties as this Decimal
       * constructor.
       *
       */
      function clone(obj) {
        var i, p, ps;

        /*
         * The Decimal constructor and exported function.
         * Return a new Decimal instance.
         *
         * v {number|string|Decimal} A numeric value.
         *
         */
        function Decimal(v) {
          var e, i, t,
            x = this;

          // Decimal called without new.
          if (!(x instanceof Decimal)) return new Decimal(v);

          // Retain a reference to this Decimal constructor, and shadow Decimal.prototype.constructor
          // which points to Object.
          x.constructor = Decimal;

          // Duplicate.
          if (isDecimalInstance(v)) {
            x.s = v.s;

            if (external) {
              if (!v.d || v.e > Decimal.maxE) {

                // Infinity.
                x.e = NaN;
                x.d = null;
              } else if (v.e < Decimal.minE) {

                // Zero.
                x.e = 0;
                x.d = [0];
              } else {
                x.e = v.e;
                x.d = v.d.slice();
              }
            } else {
              x.e = v.e;
              x.d = v.d ? v.d.slice() : v.d;
            }

            return;
          }

          t = typeof v;

          if (t === 'number') {
            if (v === 0) {
              x.s = 1 / v < 0 ? -1 : 1;
              x.e = 0;
              x.d = [0];
              return;
            }

            if (v < 0) {
              v = -v;
              x.s = -1;
            } else {
              x.s = 1;
            }

            // Fast path for small integers.
            if (v === ~~v && v < 1e7) {
              for (e = 0, i = v; i >= 10; i /= 10) e++;

              if (external) {
                if (e > Decimal.maxE) {
                  x.e = NaN;
                  x.d = null;
                } else if (e < Decimal.minE) {
                  x.e = 0;
                  x.d = [0];
                } else {
                  x.e = e;
                  x.d = [v];
                }
              } else {
                x.e = e;
                x.d = [v];
              }

              return;

            // Infinity, NaN.
            } else if (v * 0 !== 0) {
              if (!v) x.s = NaN;
              x.e = NaN;
              x.d = null;
              return;
            }

            return parseDecimal(x, v.toString());

          } else if (t !== 'string') {
            throw Error(invalidArgument + v);
          }

          // Minus sign?
          if ((i = v.charCodeAt(0)) === 45) {
            v = v.slice(1);
            x.s = -1;
          } else {
            // Plus sign?
            if (i === 43) v = v.slice(1);
            x.s = 1;
          }

          return isDecimal.test(v) ? parseDecimal(x, v) : parseOther(x, v);
        }

        Decimal.prototype = P;

        Decimal.ROUND_UP = 0;
        Decimal.ROUND_DOWN = 1;
        Decimal.ROUND_CEIL = 2;
        Decimal.ROUND_FLOOR = 3;
        Decimal.ROUND_HALF_UP = 4;
        Decimal.ROUND_HALF_DOWN = 5;
        Decimal.ROUND_HALF_EVEN = 6;
        Decimal.ROUND_HALF_CEIL = 7;
        Decimal.ROUND_HALF_FLOOR = 8;
        Decimal.EUCLID = 9;

        Decimal.config = Decimal.set = config;
        Decimal.clone = clone;
        Decimal.isDecimal = isDecimalInstance;

        Decimal.abs = abs;
        Decimal.acos = acos;
        Decimal.acosh = acosh;        // ES6
        Decimal.add = add;
        Decimal.asin = asin;
        Decimal.asinh = asinh;        // ES6
        Decimal.atan = atan;
        Decimal.atanh = atanh;        // ES6
        Decimal.atan2 = atan2;
        Decimal.cbrt = cbrt;          // ES6
        Decimal.ceil = ceil;
        Decimal.clamp = clamp;
        Decimal.cos = cos;
        Decimal.cosh = cosh;          // ES6
        Decimal.div = div;
        Decimal.exp = exp;
        Decimal.floor = floor;
        Decimal.hypot = hypot;        // ES6
        Decimal.ln = ln;
        Decimal.log = log;
        Decimal.log10 = log10;        // ES6
        Decimal.log2 = log2;          // ES6
        Decimal.max = max;
        Decimal.min = min;
        Decimal.mod = mod;
        Decimal.mul = mul;
        Decimal.pow = pow;
        Decimal.random = random;
        Decimal.round = round;
        Decimal.sign = sign;          // ES6
        Decimal.sin = sin;
        Decimal.sinh = sinh;          // ES6
        Decimal.sqrt = sqrt;
        Decimal.sub = sub;
        Decimal.sum = sum;
        Decimal.tan = tan;
        Decimal.tanh = tanh;          // ES6
        Decimal.trunc = trunc;        // ES6

        if (obj === void 0) obj = {};
        if (obj) {
          if (obj.defaults !== true) {
            ps = ['precision', 'rounding', 'toExpNeg', 'toExpPos', 'maxE', 'minE', 'modulo', 'crypto'];
            for (i = 0; i < ps.length;) if (!obj.hasOwnProperty(p = ps[i++])) obj[p] = this[p];
          }
        }

        Decimal.config(obj);

        return Decimal;
      }


      /*
       * Return a new Decimal whose value is `x` divided by `y`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       * y {number|string|Decimal}
       *
       */
      function div(x, y) {
        return new this(x).div(y);
      }


      /*
       * Return a new Decimal whose value is the natural exponential of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} The power to which to raise the base of the natural log.
       *
       */
      function exp(x) {
        return new this(x).exp();
      }


      /*
       * Return a new Decimal whose value is `x` round to an integer using `ROUND_FLOOR`.
       *
       * x {number|string|Decimal}
       *
       */
      function floor(x) {
        return finalise(x = new this(x), x.e + 1, 3);
      }


      /*
       * Return a new Decimal whose value is the square root of the sum of the squares of the arguments,
       * rounded to `precision` significant digits using rounding mode `rounding`.
       *
       * hypot(a, b, ...) = sqrt(a^2 + b^2 + ...)
       *
       * arguments {number|string|Decimal}
       *
       */
      function hypot() {
        var i, n,
          t = new this(0);

        external = false;

        for (i = 0; i < arguments.length;) {
          n = new this(arguments[i++]);
          if (!n.d) {
            if (n.s) {
              external = true;
              return new this(1 / 0);
            }
            t = n;
          } else if (t.d) {
            t = t.plus(n.times(n));
          }
        }

        external = true;

        return t.sqrt();
      }


      /*
       * Return true if object is a Decimal instance (where Decimal is any Decimal constructor),
       * otherwise return false.
       *
       */
      function isDecimalInstance(obj) {
        return obj instanceof Decimal || obj && obj.toStringTag === tag || false;
      }


      /*
       * Return a new Decimal whose value is the natural logarithm of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       *
       */
      function ln(x) {
        return new this(x).ln();
      }


      /*
       * Return a new Decimal whose value is the log of `x` to the base `y`, or to base 10 if no base
       * is specified, rounded to `precision` significant digits using rounding mode `rounding`.
       *
       * log[y](x)
       *
       * x {number|string|Decimal} The argument of the logarithm.
       * y {number|string|Decimal} The base of the logarithm.
       *
       */
      function log(x, y) {
        return new this(x).log(y);
      }


      /*
       * Return a new Decimal whose value is the base 2 logarithm of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       *
       */
      function log2(x) {
        return new this(x).log(2);
      }


      /*
       * Return a new Decimal whose value is the base 10 logarithm of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       *
       */
      function log10(x) {
        return new this(x).log(10);
      }


      /*
       * Return a new Decimal whose value is the maximum of the arguments.
       *
       * arguments {number|string|Decimal}
       *
       */
      function max() {
        return maxOrMin(this, arguments, 'lt');
      }


      /*
       * Return a new Decimal whose value is the minimum of the arguments.
       *
       * arguments {number|string|Decimal}
       *
       */
      function min() {
        return maxOrMin(this, arguments, 'gt');
      }


      /*
       * Return a new Decimal whose value is `x` modulo `y`, rounded to `precision` significant digits
       * using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       * y {number|string|Decimal}
       *
       */
      function mod(x, y) {
        return new this(x).mod(y);
      }


      /*
       * Return a new Decimal whose value is `x` multiplied by `y`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       * y {number|string|Decimal}
       *
       */
      function mul(x, y) {
        return new this(x).mul(y);
      }


      /*
       * Return a new Decimal whose value is `x` raised to the power `y`, rounded to precision
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} The base.
       * y {number|string|Decimal} The exponent.
       *
       */
      function pow(x, y) {
        return new this(x).pow(y);
      }


      /*
       * Returns a new Decimal with a random value equal to or greater than 0 and less than 1, and with
       * `sd`, or `Decimal.precision` if `sd` is omitted, significant digits (or less if trailing zeros
       * are produced).
       *
       * [sd] {number} Significant digits. Integer, 0 to MAX_DIGITS inclusive.
       *
       */
      function random(sd) {
        var d, e, k, n,
          i = 0,
          r = new this(1),
          rd = [];

        if (sd === void 0) sd = this.precision;
        else checkInt32(sd, 1, MAX_DIGITS);

        k = Math.ceil(sd / LOG_BASE);

        if (!this.crypto) {
          for (; i < k;) rd[i++] = Math.random() * 1e7 | 0;

        // Browsers supporting crypto.getRandomValues.
        } else if (crypto.getRandomValues) {
          d = crypto.getRandomValues(new Uint32Array(k));

          for (; i < k;) {
            n = d[i];

            // 0 <= n < 4294967296
            // Probability n >= 4.29e9, is 4967296 / 4294967296 = 0.00116 (1 in 865).
            if (n >= 4.29e9) {
              d[i] = crypto.getRandomValues(new Uint32Array(1))[0];
            } else {

              // 0 <= n <= 4289999999
              // 0 <= (n % 1e7) <= 9999999
              rd[i++] = n % 1e7;
            }
          }

        // Node.js supporting crypto.randomBytes.
        } else if (crypto.randomBytes) {

          // buffer
          d = crypto.randomBytes(k *= 4);

          for (; i < k;) {

            // 0 <= n < 2147483648
            n = d[i] + (d[i + 1] << 8) + (d[i + 2] << 16) + ((d[i + 3] & 0x7f) << 24);

            // Probability n >= 2.14e9, is 7483648 / 2147483648 = 0.0035 (1 in 286).
            if (n >= 2.14e9) {
              crypto.randomBytes(4).copy(d, i);
            } else {

              // 0 <= n <= 2139999999
              // 0 <= (n % 1e7) <= 9999999
              rd.push(n % 1e7);
              i += 4;
            }
          }

          i = k / 4;
        } else {
          throw Error(cryptoUnavailable);
        }

        k = rd[--i];
        sd %= LOG_BASE;

        // Convert trailing digits to zeros according to sd.
        if (k && sd) {
          n = mathpow(10, LOG_BASE - sd);
          rd[i] = (k / n | 0) * n;
        }

        // Remove trailing words which are zero.
        for (; rd[i] === 0; i--) rd.pop();

        // Zero?
        if (i < 0) {
          e = 0;
          rd = [0];
        } else {
          e = -1;

          // Remove leading words which are zero and adjust exponent accordingly.
          for (; rd[0] === 0; e -= LOG_BASE) rd.shift();

          // Count the digits of the first word of rd to determine leading zeros.
          for (k = 1, n = rd[0]; n >= 10; n /= 10) k++;

          // Adjust the exponent for leading zeros of the first word of rd.
          if (k < LOG_BASE) e -= LOG_BASE - k;
        }

        r.e = e;
        r.d = rd;

        return r;
      }


      /*
       * Return a new Decimal whose value is `x` rounded to an integer using rounding mode `rounding`.
       *
       * To emulate `Math.round`, set rounding to 7 (ROUND_HALF_CEIL).
       *
       * x {number|string|Decimal}
       *
       */
      function round(x) {
        return finalise(x = new this(x), x.e + 1, this.rounding);
      }


      /*
       * Return
       *   1    if x > 0,
       *  -1    if x < 0,
       *   0    if x is 0,
       *  -0    if x is -0,
       *   NaN  otherwise
       *
       * x {number|string|Decimal}
       *
       */
      function sign(x) {
        x = new this(x);
        return x.d ? (x.d[0] ? x.s : 0 * x.s) : x.s || NaN;
      }


      /*
       * Return a new Decimal whose value is the sine of `x`, rounded to `precision` significant digits
       * using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function sin(x) {
        return new this(x).sin();
      }


      /*
       * Return a new Decimal whose value is the hyperbolic sine of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function sinh(x) {
        return new this(x).sinh();
      }


      /*
       * Return a new Decimal whose value is the square root of `x`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       *
       */
      function sqrt(x) {
        return new this(x).sqrt();
      }


      /*
       * Return a new Decimal whose value is `x` minus `y`, rounded to `precision` significant digits
       * using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       * y {number|string|Decimal}
       *
       */
      function sub(x, y) {
        return new this(x).sub(y);
      }


      /*
       * Return a new Decimal whose value is the sum of the arguments, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * Only the result is rounded, not the intermediate calculations.
       *
       * arguments {number|string|Decimal}
       *
       */
      function sum() {
        var i = 0,
          args = arguments,
          x = new this(args[i]);

        external = false;
        for (; x.s && ++i < args.length;) x = x.plus(args[i]);
        external = true;

        return finalise(x, this.precision, this.rounding);
      }


      /*
       * Return a new Decimal whose value is the tangent of `x`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function tan(x) {
        return new this(x).tan();
      }


      /*
       * Return a new Decimal whose value is the hyperbolic tangent of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function tanh(x) {
        return new this(x).tanh();
      }


      /*
       * Return a new Decimal whose value is `x` truncated to an integer.
       *
       * x {number|string|Decimal}
       *
       */
      function trunc(x) {
        return finalise(x = new this(x), x.e + 1, 1);
      }


      // Create and configure initial Decimal constructor.
      Decimal = clone(DEFAULTS);
      Decimal.prototype.constructor = Decimal;
      Decimal['default'] = Decimal.Decimal = Decimal;

      // Create the internal constants from their string values.
      LN10 = new Decimal(LN10);
      PI = new Decimal(PI);


      // Export.


      // AMD.
      if (module.exports) {
        if (typeof Symbol == 'function' && typeof Symbol.iterator == 'symbol') {
          P[Symbol['for']('nodejs.util.inspect.custom')] = P.toString;
          P[Symbol.toStringTag] = 'Decimal';
        }

        module.exports = Decimal;

      // Browser.
      } else {
        if (!globalScope) {
          globalScope = typeof self != 'undefined' && self && self.self == self ? self : window;
        }

        noConflict = globalScope.Decimal;
        Decimal.noConflict = function () {
          globalScope.Decimal = noConflict;
          return Decimal;
        };

        globalScope.Decimal = Decimal;
      }
    })(commonjsGlobal);
    });

    var name$g = 'BigNumber';
    var dependencies$g = ['?on', 'config'];
    var createBigNumberClass = /* #__PURE__ */factory(name$g, dependencies$g, _ref => {
      var {
        on,
        config
      } = _ref;
      var BigNumber = decimal.clone({
        precision: config.precision,
        modulo: decimal.EUCLID
      });
      BigNumber.prototype = Object.create(BigNumber.prototype);
      /**
       * Attach type information
       */

      BigNumber.prototype.type = 'BigNumber';
      BigNumber.prototype.isBigNumber = true;
      /**
       * Get a JSON representation of a BigNumber containing
       * type information
       * @returns {Object} Returns a JSON object structured as:
       *                   `{"mathjs": "BigNumber", "value": "0.2"}`
       */

      BigNumber.prototype.toJSON = function () {
        return {
          mathjs: 'BigNumber',
          value: this.toString()
        };
      };
      /**
       * Instantiate a BigNumber from a JSON object
       * @param {Object} json  a JSON object structured as:
       *                       `{"mathjs": "BigNumber", "value": "0.2"}`
       * @return {BigNumber}
       */


      BigNumber.fromJSON = function (json) {
        return new BigNumber(json.value);
      };

      if (on) {
        // listen for changed in the configuration, automatically apply changed precision
        on('config', function (curr, prev) {
          if (curr.precision !== prev.precision) {
            BigNumber.config({
              precision: curr.precision
            });
          }
        });
      }

      return BigNumber;
    }, {
      isClass: true
    });

    /**
     * @license Complex.js v2.1.0 12/05/2020
     *
     * Copyright (c) 2020, Robert Eisele (robert@xarg.org)
     * Dual licensed under the MIT or GPL Version 2 licenses.
     **/

    var complex = createCommonjsModule(function (module, exports) {
    /**
     *
     * This class allows the manipulation of complex numbers.
     * You can pass a complex number in different formats. Either as object, double, string or two integer parameters.
     *
     * Object form
     * { re: <real>, im: <imaginary> }
     * { arg: <angle>, abs: <radius> }
     * { phi: <angle>, r: <radius> }
     *
     * Array / Vector form
     * [ real, imaginary ]
     *
     * Double form
     * 99.3 - Single double value
     *
     * String form
     * '23.1337' - Simple real number
     * '15+3i' - a simple complex number
     * '3-i' - a simple complex number
     *
     * Example:
     *
     * var c = new Complex('99.3+8i');
     * c.mul({r: 3, i: 9}).div(4.9).sub(3, 2);
     *
     */

    (function(root) {

      var cosh = function(x) {
        return (Math.exp(x) + Math.exp(-x)) * 0.5;
      };

      var sinh = function(x) {
        return (Math.exp(x) - Math.exp(-x)) * 0.5;
      };

      /**
       * Calculates cos(x) - 1 using Taylor series if x is small (-¼π ≤ x ≤ ¼π).
       *
       * @param {number} x
       * @returns {number} cos(x) - 1
       */
      var cosm1 = function(x) {

        var b = Math.PI / 4;
        if (-b > x || x > b) {
          return Math.cos(x) - 1.0;
        }

        /* Calculate horner form of polynomial of taylor series in Q
        var fac = 1, alt = 1, pol = {};
        for (var i = 0; i <= 16; i++) {
          fac*= i || 1;
          if (i % 2 == 0) {
            pol[i] = new Fraction(1, alt * fac);
            alt = -alt;
          }
        }
        console.log(new Polynomial(pol).toHorner()); // (((((((1/20922789888000x^2-1/87178291200)x^2+1/479001600)x^2-1/3628800)x^2+1/40320)x^2-1/720)x^2+1/24)x^2-1/2)x^2+1
        */

        var xx = x * x;
        return xx * (
          xx * (
            xx * (
              xx * (
                xx * (
                  xx * (
                    xx * (
                      xx / 20922789888000
                      - 1 / 87178291200)
                    + 1 / 479001600)
                  - 1 / 3628800)
                + 1 / 40320)
              - 1 / 720)
            + 1 / 24)
          - 1 / 2);
      };

      var hypot = function(x, y) {

        var a = Math.abs(x);
        var b = Math.abs(y);

        if (a < 3000 && b < 3000) {
          return Math.sqrt(a * a + b * b);
        }

        if (a < b) {
          a = b;
          b = x / y;
        } else {
          b = y / x;
        }
        return a * Math.sqrt(1 + b * b);
      };

      var parser_exit = function() {
        throw SyntaxError('Invalid Param');
      };

      /**
       * Calculates log(sqrt(a^2+b^2)) in a way to avoid overflows
       *
       * @param {number} a
       * @param {number} b
       * @returns {number}
       */
      function logHypot(a, b) {

        var _a = Math.abs(a);
        var _b = Math.abs(b);

        if (a === 0) {
          return Math.log(_b);
        }

        if (b === 0) {
          return Math.log(_a);
        }

        if (_a < 3000 && _b < 3000) {
          return Math.log(a * a + b * b) * 0.5;
        }

        /* I got 4 ideas to compute this property without overflow:
         *
         * Testing 1000000 times with random samples for a,b ∈ [1, 1000000000] against a big decimal library to get an error estimate
         *
         * 1. Only eliminate the square root: (OVERALL ERROR: 3.9122483030951116e-11)

         Math.log(a * a + b * b) / 2

         *
         *
         * 2. Try to use the non-overflowing pythagoras: (OVERALL ERROR: 8.889760039210159e-10)

         var fn = function(a, b) {
         a = Math.abs(a);
         b = Math.abs(b);
         var t = Math.min(a, b);
         a = Math.max(a, b);
         t = t / a;

         return Math.log(a) + Math.log(1 + t * t) / 2;
         };

         * 3. Abuse the identity cos(atan(y/x) = x / sqrt(x^2+y^2): (OVERALL ERROR: 3.4780178737037204e-10)

         Math.log(a / Math.cos(Math.atan2(b, a)))

         * 4. Use 3. and apply log rules: (OVERALL ERROR: 1.2014087502620896e-9)

         Math.log(a) - Math.log(Math.cos(Math.atan2(b, a)))

         */

         a = a / 2;
         b = b / 2;

        return 0.5 * Math.log(a * a + b * b) + Math.LN2;
      }

      var parse = function(a, b) {

        var z = { 're': 0, 'im': 0 };

        if (a === undefined || a === null) {
          z['re'] =
          z['im'] = 0;
        } else if (b !== undefined) {
          z['re'] = a;
          z['im'] = b;
        } else
          switch (typeof a) {

            case 'object':

              if ('im' in a && 're' in a) {
                z['re'] = a['re'];
                z['im'] = a['im'];
              } else if ('abs' in a && 'arg' in a) {
                if (!Number.isFinite(a['abs']) && Number.isFinite(a['arg'])) {
                  return Complex['INFINITY'];
                }
                z['re'] = a['abs'] * Math.cos(a['arg']);
                z['im'] = a['abs'] * Math.sin(a['arg']);
              } else if ('r' in a && 'phi' in a) {
                if (!Number.isFinite(a['r']) && Number.isFinite(a['phi'])) {
                  return Complex['INFINITY'];
                }
                z['re'] = a['r'] * Math.cos(a['phi']);
                z['im'] = a['r'] * Math.sin(a['phi']);
              } else if (a.length === 2) { // Quick array check
                z['re'] = a[0];
                z['im'] = a[1];
              } else {
                parser_exit();
              }
              break;

            case 'string':

              z['im'] = /* void */
              z['re'] = 0;

              var tokens = a.match(/\d+\.?\d*e[+-]?\d+|\d+\.?\d*|\.\d+|./g);
              var plus = 1;
              var minus = 0;

              if (tokens === null) {
                parser_exit();
              }

              for (var i = 0; i < tokens.length; i++) {

                var c = tokens[i];

                if (c === ' ' || c === '\t' || c === '\n') ; else if (c === '+') {
                  plus++;
                } else if (c === '-') {
                  minus++;
                } else if (c === 'i' || c === 'I') {

                  if (plus + minus === 0) {
                    parser_exit();
                  }

                  if (tokens[i + 1] !== ' ' && !isNaN(tokens[i + 1])) {
                    z['im'] += parseFloat((minus % 2 ? '-' : '') + tokens[i + 1]);
                    i++;
                  } else {
                    z['im'] += parseFloat((minus % 2 ? '-' : '') + '1');
                  }
                  plus = minus = 0;

                } else {

                  if (plus + minus === 0 || isNaN(c)) {
                    parser_exit();
                  }

                  if (tokens[i + 1] === 'i' || tokens[i + 1] === 'I') {
                    z['im'] += parseFloat((minus % 2 ? '-' : '') + c);
                    i++;
                  } else {
                    z['re'] += parseFloat((minus % 2 ? '-' : '') + c);
                  }
                  plus = minus = 0;
                }
              }

              // Still something on the stack
              if (plus + minus > 0) {
                parser_exit();
              }
              break;

            case 'number':
              z['im'] = 0;
              z['re'] = a;
              break;

            default:
              parser_exit();
          }

        if (isNaN(z['re']) || isNaN(z['im'])) ;

        return z;
      };

      /**
       * @constructor
       * @returns {Complex}
       */
      function Complex(a, b) {

        if (!(this instanceof Complex)) {
          return new Complex(a, b);
        }

        var z = parse(a, b);

        this['re'] = z['re'];
        this['im'] = z['im'];
      }

      Complex.prototype = {

        're': 0,
        'im': 0,

        /**
         * Calculates the sign of a complex number, which is a normalized complex
         *
         * @returns {Complex}
         */
        'sign': function() {

          var abs = this['abs']();

          return new Complex(
            this['re'] / abs,
            this['im'] / abs);
        },

        /**
         * Adds two complex numbers
         *
         * @returns {Complex}
         */
        'add': function(a, b) {

          var z = new Complex(a, b);

          // Infinity + Infinity = NaN
          if (this['isInfinite']() && z['isInfinite']()) {
            return Complex['NAN'];
          }

          // Infinity + z = Infinity { where z != Infinity }
          if (this['isInfinite']() || z['isInfinite']()) {
            return Complex['INFINITY'];
          }

          return new Complex(
            this['re'] + z['re'],
            this['im'] + z['im']);
        },

        /**
         * Subtracts two complex numbers
         *
         * @returns {Complex}
         */
        'sub': function(a, b) {

          var z = new Complex(a, b);

          // Infinity - Infinity = NaN
          if (this['isInfinite']() && z['isInfinite']()) {
            return Complex['NAN'];
          }

          // Infinity - z = Infinity { where z != Infinity }
          if (this['isInfinite']() || z['isInfinite']()) {
            return Complex['INFINITY'];
          }

          return new Complex(
            this['re'] - z['re'],
            this['im'] - z['im']);
        },

        /**
         * Multiplies two complex numbers
         *
         * @returns {Complex}
         */
        'mul': function(a, b) {

          var z = new Complex(a, b);

          // Infinity * 0 = NaN
          if ((this['isInfinite']() && z['isZero']()) || (this['isZero']() && z['isInfinite']())) {
            return Complex['NAN'];
          }

          // Infinity * z = Infinity { where z != 0 }
          if (this['isInfinite']() || z['isInfinite']()) {
            return Complex['INFINITY'];
          }

          // Short circuit for real values
          if (z['im'] === 0 && this['im'] === 0) {
            return new Complex(this['re'] * z['re'], 0);
          }

          return new Complex(
            this['re'] * z['re'] - this['im'] * z['im'],
            this['re'] * z['im'] + this['im'] * z['re']);
        },

        /**
         * Divides two complex numbers
         *
         * @returns {Complex}
         */
        'div': function(a, b) {

          var z = new Complex(a, b);

          // 0 / 0 = NaN and Infinity / Infinity = NaN
          if ((this['isZero']() && z['isZero']()) || (this['isInfinite']() && z['isInfinite']())) {
            return Complex['NAN'];
          }

          // Infinity / 0 = Infinity
          if (this['isInfinite']() || z['isZero']()) {
            return Complex['INFINITY'];
          }

          // 0 / Infinity = 0
          if (this['isZero']() || z['isInfinite']()) {
            return Complex['ZERO'];
          }

          a = this['re'];
          b = this['im'];

          var c = z['re'];
          var d = z['im'];
          var t, x;

          if (0 === d) {
            // Divisor is real
            return new Complex(a / c, b / c);
          }

          if (Math.abs(c) < Math.abs(d)) {

            x = c / d;
            t = c * x + d;

            return new Complex(
              (a * x + b) / t,
              (b * x - a) / t);

          } else {

            x = d / c;
            t = d * x + c;

            return new Complex(
              (a + b * x) / t,
              (b - a * x) / t);
          }
        },

        /**
         * Calculate the power of two complex numbers
         *
         * @returns {Complex}
         */
        'pow': function(a, b) {

          var z = new Complex(a, b);

          a = this['re'];
          b = this['im'];

          if (z['isZero']()) {
            return Complex['ONE'];
          }

          // If the exponent is real
          if (z['im'] === 0) {

            if (b === 0 && a > 0) {

              return new Complex(Math.pow(a, z['re']), 0);

            } else if (a === 0) { // If base is fully imaginary

              switch ((z['re'] % 4 + 4) % 4) {
                case 0:
                  return new Complex(Math.pow(b, z['re']), 0);
                case 1:
                  return new Complex(0, Math.pow(b, z['re']));
                case 2:
                  return new Complex(-Math.pow(b, z['re']), 0);
                case 3:
                  return new Complex(0, -Math.pow(b, z['re']));
              }
            }
          }

          /* I couldn't find a good formula, so here is a derivation and optimization
           *
           * z_1^z_2 = (a + bi)^(c + di)
           *         = exp((c + di) * log(a + bi)
           *         = pow(a^2 + b^2, (c + di) / 2) * exp(i(c + di)atan2(b, a))
           * =>...
           * Re = (pow(a^2 + b^2, c / 2) * exp(-d * atan2(b, a))) * cos(d * log(a^2 + b^2) / 2 + c * atan2(b, a))
           * Im = (pow(a^2 + b^2, c / 2) * exp(-d * atan2(b, a))) * sin(d * log(a^2 + b^2) / 2 + c * atan2(b, a))
           *
           * =>...
           * Re = exp(c * log(sqrt(a^2 + b^2)) - d * atan2(b, a)) * cos(d * log(sqrt(a^2 + b^2)) + c * atan2(b, a))
           * Im = exp(c * log(sqrt(a^2 + b^2)) - d * atan2(b, a)) * sin(d * log(sqrt(a^2 + b^2)) + c * atan2(b, a))
           *
           * =>
           * Re = exp(c * logsq2 - d * arg(z_1)) * cos(d * logsq2 + c * arg(z_1))
           * Im = exp(c * logsq2 - d * arg(z_1)) * sin(d * logsq2 + c * arg(z_1))
           *
           */

          if (a === 0 && b === 0 && z['re'] > 0 && z['im'] >= 0) {
            return Complex['ZERO'];
          }

          var arg = Math.atan2(b, a);
          var loh = logHypot(a, b);

          a = Math.exp(z['re'] * loh - z['im'] * arg);
          b = z['im'] * loh + z['re'] * arg;
          return new Complex(
            a * Math.cos(b),
            a * Math.sin(b));
        },

        /**
         * Calculate the complex square root
         *
         * @returns {Complex}
         */
        'sqrt': function() {

          var a = this['re'];
          var b = this['im'];
          var r = this['abs']();

          var re, im;

          if (a >= 0) {

            if (b === 0) {
              return new Complex(Math.sqrt(a), 0);
            }

            re = 0.5 * Math.sqrt(2.0 * (r + a));
          } else {
            re = Math.abs(b) / Math.sqrt(2 * (r - a));
          }

          if (a <= 0) {
            im = 0.5 * Math.sqrt(2.0 * (r - a));
          } else {
            im = Math.abs(b) / Math.sqrt(2 * (r + a));
          }

          return new Complex(re, b < 0 ? -im : im);
        },

        /**
         * Calculate the complex exponent
         *
         * @returns {Complex}
         */
        'exp': function() {

          var tmp = Math.exp(this['re']);

          if (this['im'] === 0) ;
          return new Complex(
            tmp * Math.cos(this['im']),
            tmp * Math.sin(this['im']));
        },

        /**
         * Calculate the complex exponent and subtracts one.
         *
         * This may be more accurate than `Complex(x).exp().sub(1)` if
         * `x` is small.
         *
         * @returns {Complex}
         */
        'expm1': function() {

          /**
           * exp(a + i*b) - 1
           = exp(a) * (cos(b) + j*sin(b)) - 1
           = expm1(a)*cos(b) + cosm1(b) + j*exp(a)*sin(b)
           */

          var a = this['re'];
          var b = this['im'];

          return new Complex(
            Math.expm1(a) * Math.cos(b) + cosm1(b),
            Math.exp(a) * Math.sin(b));
        },

        /**
         * Calculate the natural log
         *
         * @returns {Complex}
         */
        'log': function() {

          var a = this['re'];
          var b = this['im'];

          return new Complex(
            logHypot(a, b),
            Math.atan2(b, a));
        },

        /**
         * Calculate the magnitude of the complex number
         *
         * @returns {number}
         */
        'abs': function() {

          return hypot(this['re'], this['im']);
        },

        /**
         * Calculate the angle of the complex number
         *
         * @returns {number}
         */
        'arg': function() {

          return Math.atan2(this['im'], this['re']);
        },

        /**
         * Calculate the sine of the complex number
         *
         * @returns {Complex}
         */
        'sin': function() {

          // sin(z) = ( e^iz - e^-iz ) / 2i 
          //        = sin(a)cosh(b) + i cos(a)sinh(b)

          var a = this['re'];
          var b = this['im'];

          return new Complex(
            Math.sin(a) * cosh(b),
            Math.cos(a) * sinh(b));
        },

        /**
         * Calculate the cosine
         *
         * @returns {Complex}
         */
        'cos': function() {

          // cos(z) = ( e^iz + e^-iz ) / 2 
          //        = cos(a)cosh(b) - i sin(a)sinh(b)

          var a = this['re'];
          var b = this['im'];

          return new Complex(
            Math.cos(a) * cosh(b),
            -Math.sin(a) * sinh(b));
        },

        /**
         * Calculate the tangent
         *
         * @returns {Complex}
         */
        'tan': function() {

          // tan(z) = sin(z) / cos(z) 
          //        = ( e^iz - e^-iz ) / ( i( e^iz + e^-iz ) )
          //        = ( e^2iz - 1 ) / i( e^2iz + 1 )
          //        = ( sin(2a) + i sinh(2b) ) / ( cos(2a) + cosh(2b) )

          var a = 2 * this['re'];
          var b = 2 * this['im'];
          var d = Math.cos(a) + cosh(b);

          return new Complex(
            Math.sin(a) / d,
            sinh(b) / d);
        },

        /**
         * Calculate the cotangent
         *
         * @returns {Complex}
         */
        'cot': function() {

          // cot(c) = i(e^(ci) + e^(-ci)) / (e^(ci) - e^(-ci))

          var a = 2 * this['re'];
          var b = 2 * this['im'];
          var d = Math.cos(a) - cosh(b);

          return new Complex(
            -Math.sin(a) / d,
            sinh(b) / d);
        },

        /**
         * Calculate the secant
         *
         * @returns {Complex}
         */
        'sec': function() {

          // sec(c) = 2 / (e^(ci) + e^(-ci))

          var a = this['re'];
          var b = this['im'];
          var d = 0.5 * cosh(2 * b) + 0.5 * Math.cos(2 * a);

          return new Complex(
            Math.cos(a) * cosh(b) / d,
            Math.sin(a) * sinh(b) / d);
        },

        /**
         * Calculate the cosecans
         *
         * @returns {Complex}
         */
        'csc': function() {

          // csc(c) = 2i / (e^(ci) - e^(-ci))

          var a = this['re'];
          var b = this['im'];
          var d = 0.5 * cosh(2 * b) - 0.5 * Math.cos(2 * a);

          return new Complex(
            Math.sin(a) * cosh(b) / d,
            -Math.cos(a) * sinh(b) / d);
        },

        /**
         * Calculate the complex arcus sinus
         *
         * @returns {Complex}
         */
        'asin': function() {

          // asin(c) = -i * log(ci + sqrt(1 - c^2))

          var a = this['re'];
          var b = this['im'];

          var t1 = new Complex(
            b * b - a * a + 1,
            -2 * a * b)['sqrt']();

          var t2 = new Complex(
            t1['re'] - b,
            t1['im'] + a)['log']();

          return new Complex(t2['im'], -t2['re']);
        },

        /**
         * Calculate the complex arcus cosinus
         *
         * @returns {Complex}
         */
        'acos': function() {

          // acos(c) = i * log(c - i * sqrt(1 - c^2))

          var a = this['re'];
          var b = this['im'];

          var t1 = new Complex(
            b * b - a * a + 1,
            -2 * a * b)['sqrt']();

          var t2 = new Complex(
            t1['re'] - b,
            t1['im'] + a)['log']();

          return new Complex(Math.PI / 2 - t2['im'], t2['re']);
        },

        /**
         * Calculate the complex arcus tangent
         *
         * @returns {Complex}
         */
        'atan': function() {

          // atan(c) = i / 2 log((i + x) / (i - x))

          var a = this['re'];
          var b = this['im'];

          if (a === 0) {

            if (b === 1) {
              return new Complex(0, Infinity);
            }

            if (b === -1) {
              return new Complex(0, -Infinity);
            }
          }

          var d = a * a + (1.0 - b) * (1.0 - b);

          var t1 = new Complex(
            (1 - b * b - a * a) / d,
            -2 * a / d).log();

          return new Complex(-0.5 * t1['im'], 0.5 * t1['re']);
        },

        /**
         * Calculate the complex arcus cotangent
         *
         * @returns {Complex}
         */
        'acot': function() {

          // acot(c) = i / 2 log((c - i) / (c + i))

          var a = this['re'];
          var b = this['im'];

          if (b === 0) {
            return new Complex(Math.atan2(1, a), 0);
          }

          var d = a * a + b * b;
          return (d !== 0)
            ? new Complex(
              a / d,
              -b / d).atan()
            : new Complex(
              (a !== 0) ? a / 0 : 0,
              (b !== 0) ? -b / 0 : 0).atan();
        },

        /**
         * Calculate the complex arcus secant
         *
         * @returns {Complex}
         */
        'asec': function() {

          // asec(c) = -i * log(1 / c + sqrt(1 - i / c^2))

          var a = this['re'];
          var b = this['im'];

          if (a === 0 && b === 0) {
            return new Complex(0, Infinity);
          }

          var d = a * a + b * b;
          return (d !== 0)
            ? new Complex(
              a / d,
              -b / d).acos()
            : new Complex(
              (a !== 0) ? a / 0 : 0,
              (b !== 0) ? -b / 0 : 0).acos();
        },

        /**
         * Calculate the complex arcus cosecans
         *
         * @returns {Complex}
         */
        'acsc': function() {

          // acsc(c) = -i * log(i / c + sqrt(1 - 1 / c^2))

          var a = this['re'];
          var b = this['im'];

          if (a === 0 && b === 0) {
            return new Complex(Math.PI / 2, Infinity);
          }

          var d = a * a + b * b;
          return (d !== 0)
            ? new Complex(
              a / d,
              -b / d).asin()
            : new Complex(
              (a !== 0) ? a / 0 : 0,
              (b !== 0) ? -b / 0 : 0).asin();
        },

        /**
         * Calculate the complex sinh
         *
         * @returns {Complex}
         */
        'sinh': function() {

          // sinh(c) = (e^c - e^-c) / 2

          var a = this['re'];
          var b = this['im'];

          return new Complex(
            sinh(a) * Math.cos(b),
            cosh(a) * Math.sin(b));
        },

        /**
         * Calculate the complex cosh
         *
         * @returns {Complex}
         */
        'cosh': function() {

          // cosh(c) = (e^c + e^-c) / 2

          var a = this['re'];
          var b = this['im'];

          return new Complex(
            cosh(a) * Math.cos(b),
            sinh(a) * Math.sin(b));
        },

        /**
         * Calculate the complex tanh
         *
         * @returns {Complex}
         */
        'tanh': function() {

          // tanh(c) = (e^c - e^-c) / (e^c + e^-c)

          var a = 2 * this['re'];
          var b = 2 * this['im'];
          var d = cosh(a) + Math.cos(b);

          return new Complex(
            sinh(a) / d,
            Math.sin(b) / d);
        },

        /**
         * Calculate the complex coth
         *
         * @returns {Complex}
         */
        'coth': function() {

          // coth(c) = (e^c + e^-c) / (e^c - e^-c)

          var a = 2 * this['re'];
          var b = 2 * this['im'];
          var d = cosh(a) - Math.cos(b);

          return new Complex(
            sinh(a) / d,
            -Math.sin(b) / d);
        },

        /**
         * Calculate the complex coth
         *
         * @returns {Complex}
         */
        'csch': function() {

          // csch(c) = 2 / (e^c - e^-c)

          var a = this['re'];
          var b = this['im'];
          var d = Math.cos(2 * b) - cosh(2 * a);

          return new Complex(
            -2 * sinh(a) * Math.cos(b) / d,
            2 * cosh(a) * Math.sin(b) / d);
        },

        /**
         * Calculate the complex sech
         *
         * @returns {Complex}
         */
        'sech': function() {

          // sech(c) = 2 / (e^c + e^-c)

          var a = this['re'];
          var b = this['im'];
          var d = Math.cos(2 * b) + cosh(2 * a);

          return new Complex(
            2 * cosh(a) * Math.cos(b) / d,
            -2 * sinh(a) * Math.sin(b) / d);
        },

        /**
         * Calculate the complex asinh
         *
         * @returns {Complex}
         */
        'asinh': function() {

          // asinh(c) = log(c + sqrt(c^2 + 1))

          var tmp = this['im'];
          this['im'] = -this['re'];
          this['re'] = tmp;
          var res = this['asin']();

          this['re'] = -this['im'];
          this['im'] = tmp;
          tmp = res['re'];

          res['re'] = -res['im'];
          res['im'] = tmp;
          return res;
        },

        /**
         * Calculate the complex acosh
         *
         * @returns {Complex}
         */
        'acosh': function() {

          // acosh(c) = log(c + sqrt(c^2 - 1))

          var res = this['acos']();
          if (res['im'] <= 0) {
            var tmp = res['re'];
            res['re'] = -res['im'];
            res['im'] = tmp;
          } else {
            var tmp = res['im'];
            res['im'] = -res['re'];
            res['re'] = tmp;
          }
          return res;
        },

        /**
         * Calculate the complex atanh
         *
         * @returns {Complex}
         */
        'atanh': function() {

          // atanh(c) = log((1+c) / (1-c)) / 2

          var a = this['re'];
          var b = this['im'];

          var noIM = a > 1 && b === 0;
          var oneMinus = 1 - a;
          var onePlus = 1 + a;
          var d = oneMinus * oneMinus + b * b;

          var x = (d !== 0)
            ? new Complex(
              (onePlus * oneMinus - b * b) / d,
              (b * oneMinus + onePlus * b) / d)
            : new Complex(
              (a !== -1) ? (a / 0) : 0,
              (b !== 0) ? (b / 0) : 0);

          var temp = x['re'];
          x['re'] = logHypot(x['re'], x['im']) / 2;
          x['im'] = Math.atan2(x['im'], temp) / 2;
          if (noIM) {
            x['im'] = -x['im'];
          }
          return x;
        },

        /**
         * Calculate the complex acoth
         *
         * @returns {Complex}
         */
        'acoth': function() {

          // acoth(c) = log((c+1) / (c-1)) / 2

          var a = this['re'];
          var b = this['im'];

          if (a === 0 && b === 0) {
            return new Complex(0, Math.PI / 2);
          }

          var d = a * a + b * b;
          return (d !== 0)
            ? new Complex(
              a / d,
              -b / d).atanh()
            : new Complex(
              (a !== 0) ? a / 0 : 0,
              (b !== 0) ? -b / 0 : 0).atanh();
        },

        /**
         * Calculate the complex acsch
         *
         * @returns {Complex}
         */
        'acsch': function() {

          // acsch(c) = log((1+sqrt(1+c^2))/c)

          var a = this['re'];
          var b = this['im'];

          if (b === 0) {

            return new Complex(
              (a !== 0)
                ? Math.log(a + Math.sqrt(a * a + 1))
                : Infinity, 0);
          }

          var d = a * a + b * b;
          return (d !== 0)
            ? new Complex(
              a / d,
              -b / d).asinh()
            : new Complex(
              (a !== 0) ? a / 0 : 0,
              (b !== 0) ? -b / 0 : 0).asinh();
        },

        /**
         * Calculate the complex asech
         *
         * @returns {Complex}
         */
        'asech': function() {

          // asech(c) = log((1+sqrt(1-c^2))/c)

          var a = this['re'];
          var b = this['im'];

          if (this['isZero']()) {
            return Complex['INFINITY'];
          }

          var d = a * a + b * b;
          return (d !== 0)
            ? new Complex(
              a / d,
              -b / d).acosh()
            : new Complex(
              (a !== 0) ? a / 0 : 0,
              (b !== 0) ? -b / 0 : 0).acosh();
        },

        /**
         * Calculate the complex inverse 1/z
         *
         * @returns {Complex}
         */
        'inverse': function() {

          // 1 / 0 = Infinity and 1 / Infinity = 0
          if (this['isZero']()) {
            return Complex['INFINITY'];
          }

          if (this['isInfinite']()) {
            return Complex['ZERO'];
          }

          var a = this['re'];
          var b = this['im'];

          var d = a * a + b * b;

          return new Complex(a / d, -b / d);
        },

        /**
         * Returns the complex conjugate
         *
         * @returns {Complex}
         */
        'conjugate': function() {

          return new Complex(this['re'], -this['im']);
        },

        /**
         * Gets the negated complex number
         *
         * @returns {Complex}
         */
        'neg': function() {

          return new Complex(-this['re'], -this['im']);
        },

        /**
         * Ceils the actual complex number
         *
         * @returns {Complex}
         */
        'ceil': function(places) {

          places = Math.pow(10, places || 0);

          return new Complex(
            Math.ceil(this['re'] * places) / places,
            Math.ceil(this['im'] * places) / places);
        },

        /**
         * Floors the actual complex number
         *
         * @returns {Complex}
         */
        'floor': function(places) {

          places = Math.pow(10, places || 0);

          return new Complex(
            Math.floor(this['re'] * places) / places,
            Math.floor(this['im'] * places) / places);
        },

        /**
         * Ceils the actual complex number
         *
         * @returns {Complex}
         */
        'round': function(places) {

          places = Math.pow(10, places || 0);

          return new Complex(
            Math.round(this['re'] * places) / places,
            Math.round(this['im'] * places) / places);
        },

        /**
         * Compares two complex numbers
         *
         * **Note:** new Complex(Infinity).equals(Infinity) === false
         *
         * @returns {boolean}
         */
        'equals': function(a, b) {

          var z = new Complex(a, b);

          return Math.abs(z['re'] - this['re']) <= Complex['EPSILON'] &&
            Math.abs(z['im'] - this['im']) <= Complex['EPSILON'];
        },

        /**
         * Clones the actual object
         *
         * @returns {Complex}
         */
        'clone': function() {

          return new Complex(this['re'], this['im']);
        },

        /**
         * Gets a string of the actual complex number
         *
         * @returns {string}
         */
        'toString': function() {

          var a = this['re'];
          var b = this['im'];
          var ret = "";

          if (this['isNaN']()) {
            return 'NaN';
          }

          if (this['isInfinite']()) {
            return 'Infinity';
          }

          if (Math.abs(a) < Complex['EPSILON']) {
            a = 0;
          }

          if (Math.abs(b) < Complex['EPSILON']) {
            b = 0;
          }

          // If is real number
          if (b === 0) {
            return ret + a;
          }

          if (a !== 0) {
            ret += a;
            ret += " ";
            if (b < 0) {
              b = -b;
              ret += "-";
            } else {
              ret += "+";
            }
            ret += " ";
          } else if (b < 0) {
            b = -b;
            ret += "-";
          }

          if (1 !== b) { // b is the absolute imaginary part
            ret += b;
          }
          return ret + "i";
        },

        /**
         * Returns the actual number as a vector
         *
         * @returns {Array}
         */
        'toVector': function() {

          return [this['re'], this['im']];
        },

        /**
         * Returns the actual real value of the current object
         *
         * @returns {number|null}
         */
        'valueOf': function() {

          if (this['im'] === 0) {
            return this['re'];
          }
          return null;
        },

        /**
         * Determines whether a complex number is not on the Riemann sphere.
         *
         * @returns {boolean}
         */
        'isNaN': function() {
          return isNaN(this['re']) || isNaN(this['im']);
        },

        /**
         * Determines whether or not a complex number is at the zero pole of the
         * Riemann sphere.
         *
         * @returns {boolean}
         */
        'isZero': function() {
          return this['im'] === 0 && this['re'] === 0;
        },

        /**
         * Determines whether a complex number is not at the infinity pole of the
         * Riemann sphere.
         *
         * @returns {boolean}
         */
        'isFinite': function() {
          return isFinite(this['re']) && isFinite(this['im']);
        },

        /**
         * Determines whether or not a complex number is at the infinity pole of the
         * Riemann sphere.
         *
         * @returns {boolean}
         */
        'isInfinite': function() {
          return !(this['isNaN']() || this['isFinite']());
        }
      };

      Complex['ZERO'] = new Complex(0, 0);
      Complex['ONE'] = new Complex(1, 0);
      Complex['I'] = new Complex(0, 1);
      Complex['PI'] = new Complex(Math.PI, 0);
      Complex['E'] = new Complex(Math.E, 0);
      Complex['INFINITY'] = new Complex(Infinity, Infinity);
      Complex['NAN'] = new Complex(NaN, NaN);
      Complex['EPSILON'] = 1e-15;

      {
        Object.defineProperty(Complex, "__esModule", { 'value': true });
        Complex['default'] = Complex;
        Complex['Complex'] = Complex;
        module['exports'] = Complex;
      }

    })();
    });

    var Complex$1 = /*@__PURE__*/getDefaultExportFromCjs(complex);

    var name$f = 'Complex';
    var dependencies$f = [];
    var createComplexClass = /* #__PURE__ */factory(name$f, dependencies$f, () => {
      /**
       * Attach type information
       */
      Complex$1.prototype.type = 'Complex';
      Complex$1.prototype.isComplex = true;
      /**
       * Get a JSON representation of the complex number
       * @returns {Object} Returns a JSON object structured as:
       *                   `{"mathjs": "Complex", "re": 2, "im": 3}`
       */

      Complex$1.prototype.toJSON = function () {
        return {
          mathjs: 'Complex',
          re: this.re,
          im: this.im
        };
      };
      /*
       * Return the value of the complex number in polar notation
       * The angle phi will be set in the interval of [-pi, pi].
       * @return {{r: number, phi: number}} Returns and object with properties r and phi.
       */


      Complex$1.prototype.toPolar = function () {
        return {
          r: this.abs(),
          phi: this.arg()
        };
      };
      /**
       * Get a string representation of the complex number,
       * with optional formatting options.
       * @param {Object | number | Function} [options]  Formatting options. See
       *                                                lib/utils/number:format for a
       *                                                description of the available
       *                                                options.
       * @return {string} str
       */


      Complex$1.prototype.format = function (options) {
        var str = '';
        var im = this.im;
        var re = this.re;
        var strRe = format$2(this.re, options);
        var strIm = format$2(this.im, options); // round either re or im when smaller than the configured precision

        var precision = isNumber(options) ? options : options ? options.precision : null;

        if (precision !== null) {
          var epsilon = Math.pow(10, -precision);

          if (Math.abs(re / im) < epsilon) {
            re = 0;
          }

          if (Math.abs(im / re) < epsilon) {
            im = 0;
          }
        }

        if (im === 0) {
          // real value
          str = strRe;
        } else if (re === 0) {
          // purely complex value
          if (im === 1) {
            str = 'i';
          } else if (im === -1) {
            str = '-i';
          } else {
            str = strIm + 'i';
          }
        } else {
          // complex value
          if (im < 0) {
            if (im === -1) {
              str = strRe + ' - i';
            } else {
              str = strRe + ' - ' + strIm.substring(1) + 'i';
            }
          } else {
            if (im === 1) {
              str = strRe + ' + i';
            } else {
              str = strRe + ' + ' + strIm + 'i';
            }
          }
        }

        return str;
      };
      /**
       * Create a complex number from polar coordinates
       *
       * Usage:
       *
       *     Complex.fromPolar(r: number, phi: number) : Complex
       *     Complex.fromPolar({r: number, phi: number}) : Complex
       *
       * @param {*} args...
       * @return {Complex}
       */


      Complex$1.fromPolar = function (args) {
        switch (arguments.length) {
          case 1:
            {
              var arg = arguments[0];

              if (typeof arg === 'object') {
                return Complex$1(arg);
              } else {
                throw new TypeError('Input has to be an object with r and phi keys.');
              }
            }

          case 2:
            {
              var r = arguments[0];
              var phi = arguments[1];

              if (isNumber(r)) {
                if (isUnit(phi) && phi.hasBase('ANGLE')) {
                  // convert unit to a number in radians
                  phi = phi.toNumber('rad');
                }

                if (isNumber(phi)) {
                  return new Complex$1({
                    r: r,
                    phi: phi
                  });
                }

                throw new TypeError('Phi is not a number nor an angle unit.');
              } else {
                throw new TypeError('Radius r is not a number.');
              }
            }

          default:
            throw new SyntaxError('Wrong number of arguments in function fromPolar');
        }
      };

      Complex$1.prototype.valueOf = Complex$1.prototype.toString;
      /**
       * Create a Complex number from a JSON object
       * @param {Object} json  A JSON Object structured as
       *                       {"mathjs": "Complex", "re": 2, "im": 3}
       *                       All properties are optional, default values
       *                       for `re` and `im` are 0.
       * @return {Complex} Returns a new Complex number
       */

      Complex$1.fromJSON = function (json) {
        return new Complex$1(json);
      };
      /**
       * Compare two complex numbers, `a` and `b`:
       *
       * - Returns 1 when the real part of `a` is larger than the real part of `b`
       * - Returns -1 when the real part of `a` is smaller than the real part of `b`
       * - Returns 1 when the real parts are equal
       *   and the imaginary part of `a` is larger than the imaginary part of `b`
       * - Returns -1 when the real parts are equal
       *   and the imaginary part of `a` is smaller than the imaginary part of `b`
       * - Returns 0 when both real and imaginary parts are equal.
       *
       * @params {Complex} a
       * @params {Complex} b
       * @returns {number} Returns the comparison result: -1, 0, or 1
       */


      Complex$1.compare = function (a, b) {
        if (a.re > b.re) {
          return 1;
        }

        if (a.re < b.re) {
          return -1;
        }

        if (a.im > b.im) {
          return 1;
        }

        if (a.im < b.im) {
          return -1;
        }

        return 0;
      };

      return Complex$1;
    }, {
      isClass: true
    });

    /**
     * @license Fraction.js v4.2.0 05/03/2022
     * https://www.xarg.org/2014/03/rational-numbers-in-javascript/
     *
     * Copyright (c) 2021, Robert Eisele (robert@xarg.org)
     * Dual licensed under the MIT or GPL Version 2 licenses.
     **/

    var fraction = createCommonjsModule(function (module, exports) {
    /**
     *
     * This class offers the possibility to calculate fractions.
     * You can pass a fraction in different formats. Either as array, as double, as string or as an integer.
     *
     * Array/Object form
     * [ 0 => <nominator>, 1 => <denominator> ]
     * [ n => <nominator>, d => <denominator> ]
     *
     * Integer form
     * - Single integer value
     *
     * Double form
     * - Single double value
     *
     * String form
     * 123.456 - a simple double
     * 123/456 - a string fraction
     * 123.'456' - a double with repeating decimal places
     * 123.(456) - synonym
     * 123.45'6' - a double with repeating last place
     * 123.45(6) - synonym
     *
     * Example:
     *
     * var f = new Fraction("9.4'31'");
     * f.mul([-4, 3]).div(4.9);
     *
     */

    (function(root) {

      // Maximum search depth for cyclic rational numbers. 2000 should be more than enough.
      // Example: 1/7 = 0.(142857) has 6 repeating decimal places.
      // If MAX_CYCLE_LEN gets reduced, long cycles will not be detected and toString() only gets the first 10 digits
      var MAX_CYCLE_LEN = 2000;

      // Parsed data to avoid calling "new" all the time
      var P = {
        "s": 1,
        "n": 0,
        "d": 1
      };

      function assign(n, s) {

        if (isNaN(n = parseInt(n, 10))) {
          throw Fraction['InvalidParameter'];
        }
        return n * s;
      }

      // Creates a new Fraction internally without the need of the bulky constructor
      function newFraction(n, d) {

        if (d === 0) {
          throw Fraction['DivisionByZero'];
        }

        var f = Object.create(Fraction.prototype);
        f["s"] = n < 0 ? -1 : 1;

        n = n < 0 ? -n : n;

        var a = gcd(n, d);

        f["n"] = n / a;
        f["d"] = d / a;
        return f;
      }

      function factorize(num) {

        var factors = {};

        var n = num;
        var i = 2;
        var s = 4;

        while (s <= n) {

          while (n % i === 0) {
            n/= i;
            factors[i] = (factors[i] || 0) + 1;
          }
          s+= 1 + 2 * i++;
        }

        if (n !== num) {
          if (n > 1)
            factors[n] = (factors[n] || 0) + 1;
        } else {
          factors[num] = (factors[num] || 0) + 1;
        }
        return factors;
      }

      var parse = function(p1, p2) {

        var n = 0, d = 1, s = 1;
        var v = 0, w = 0, x = 0, y = 1, z = 1;

        var A = 0, B = 1;
        var C = 1, D = 1;

        var N = 10000000;
        var M;

        if (p1 === undefined || p1 === null) ; else if (p2 !== undefined) {
          n = p1;
          d = p2;
          s = n * d;

          if (n % 1 !== 0 || d % 1 !== 0) {
            throw Fraction['NonIntegerParameter'];
          }

        } else
          switch (typeof p1) {

            case "object":
              {
                if ("d" in p1 && "n" in p1) {
                  n = p1["n"];
                  d = p1["d"];
                  if ("s" in p1)
                    n*= p1["s"];
                } else if (0 in p1) {
                  n = p1[0];
                  if (1 in p1)
                    d = p1[1];
                } else {
                  throw Fraction['InvalidParameter'];
                }
                s = n * d;
                break;
              }
            case "number":
              {
                if (p1 < 0) {
                  s = p1;
                  p1 = -p1;
                }

                if (p1 % 1 === 0) {
                  n = p1;
                } else if (p1 > 0) { // check for != 0, scale would become NaN (log(0)), which converges really slow

                  if (p1 >= 1) {
                    z = Math.pow(10, Math.floor(1 + Math.log(p1) / Math.LN10));
                    p1/= z;
                  }

                  // Using Farey Sequences
                  // http://www.johndcook.com/blog/2010/10/20/best-rational-approximation/

                  while (B <= N && D <= N) {
                    M = (A + C) / (B + D);

                    if (p1 === M) {
                      if (B + D <= N) {
                        n = A + C;
                        d = B + D;
                      } else if (D > B) {
                        n = C;
                        d = D;
                      } else {
                        n = A;
                        d = B;
                      }
                      break;

                    } else {

                      if (p1 > M) {
                        A+= C;
                        B+= D;
                      } else {
                        C+= A;
                        D+= B;
                      }

                      if (B > N) {
                        n = C;
                        d = D;
                      } else {
                        n = A;
                        d = B;
                      }
                    }
                  }
                  n*= z;
                } else if (isNaN(p1) || isNaN(p2)) {
                  d = n = NaN;
                }
                break;
              }
            case "string":
              {
                B = p1.match(/\d+|./g);

                if (B === null)
                  throw Fraction['InvalidParameter'];

                if (B[A] === '-') {// Check for minus sign at the beginning
                  s = -1;
                  A++;
                } else if (B[A] === '+') {// Check for plus sign at the beginning
                  A++;
                }

                if (B.length === A + 1) { // Check if it's just a simple number "1234"
                  w = assign(B[A++], s);
                } else if (B[A + 1] === '.' || B[A] === '.') { // Check if it's a decimal number

                  if (B[A] !== '.') { // Handle 0.5 and .5
                    v = assign(B[A++], s);
                  }
                  A++;

                  // Check for decimal places
                  if (A + 1 === B.length || B[A + 1] === '(' && B[A + 3] === ')' || B[A + 1] === "'" && B[A + 3] === "'") {
                    w = assign(B[A], s);
                    y = Math.pow(10, B[A].length);
                    A++;
                  }

                  // Check for repeating places
                  if (B[A] === '(' && B[A + 2] === ')' || B[A] === "'" && B[A + 2] === "'") {
                    x = assign(B[A + 1], s);
                    z = Math.pow(10, B[A + 1].length) - 1;
                    A+= 3;
                  }

                } else if (B[A + 1] === '/' || B[A + 1] === ':') { // Check for a simple fraction "123/456" or "123:456"
                  w = assign(B[A], s);
                  y = assign(B[A + 2], 1);
                  A+= 3;
                } else if (B[A + 3] === '/' && B[A + 1] === ' ') { // Check for a complex fraction "123 1/2"
                  v = assign(B[A], s);
                  w = assign(B[A + 2], s);
                  y = assign(B[A + 4], 1);
                  A+= 5;
                }

                if (B.length <= A) { // Check for more tokens on the stack
                  d = y * z;
                  s = /* void */
                  n = x + d * v + z * w;
                  break;
                }

                /* Fall through on error */
              }
            default:
              throw Fraction['InvalidParameter'];
          }

        if (d === 0) {
          throw Fraction['DivisionByZero'];
        }

        P["s"] = s < 0 ? -1 : 1;
        P["n"] = Math.abs(n);
        P["d"] = Math.abs(d);
      };

      function modpow(b, e, m) {

        var r = 1;
        for (; e > 0; b = (b * b) % m, e >>= 1) {

          if (e & 1) {
            r = (r * b) % m;
          }
        }
        return r;
      }


      function cycleLen(n, d) {

        for (; d % 2 === 0;
          d/= 2) {
        }

        for (; d % 5 === 0;
          d/= 5) {
        }

        if (d === 1) // Catch non-cyclic numbers
          return 0;

        // If we would like to compute really large numbers quicker, we could make use of Fermat's little theorem:
        // 10^(d-1) % d == 1
        // However, we don't need such large numbers and MAX_CYCLE_LEN should be the capstone,
        // as we want to translate the numbers to strings.

        var rem = 10 % d;
        var t = 1;

        for (; rem !== 1; t++) {
          rem = rem * 10 % d;

          if (t > MAX_CYCLE_LEN)
            return 0; // Returning 0 here means that we don't print it as a cyclic number. It's likely that the answer is `d-1`
        }
        return t;
      }


      function cycleStart(n, d, len) {

        var rem1 = 1;
        var rem2 = modpow(10, len, d);

        for (var t = 0; t < 300; t++) { // s < ~log10(Number.MAX_VALUE)
          // Solve 10^s == 10^(s+t) (mod d)

          if (rem1 === rem2)
            return t;

          rem1 = rem1 * 10 % d;
          rem2 = rem2 * 10 % d;
        }
        return 0;
      }

      function gcd(a, b) {

        if (!a)
          return b;
        if (!b)
          return a;

        while (1) {
          a%= b;
          if (!a)
            return b;
          b%= a;
          if (!b)
            return a;
        }
      }
      /**
       * Module constructor
       *
       * @constructor
       * @param {number|Fraction=} a
       * @param {number=} b
       */
      function Fraction(a, b) {

        parse(a, b);

        if (this instanceof Fraction) {
          a = gcd(P["d"], P["n"]); // Abuse variable a
          this["s"] = P["s"];
          this["n"] = P["n"] / a;
          this["d"] = P["d"] / a;
        } else {
          return newFraction(P['s'] * P['n'], P['d']);
        }
      }

      Fraction['DivisionByZero'] = new Error("Division by Zero");
      Fraction['InvalidParameter'] = new Error("Invalid argument");
      Fraction['NonIntegerParameter'] = new Error("Parameters must be integer");

      Fraction.prototype = {

        "s": 1,
        "n": 0,
        "d": 1,

        /**
         * Calculates the absolute value
         *
         * Ex: new Fraction(-4).abs() => 4
         **/
        "abs": function() {

          return newFraction(this["n"], this["d"]);
        },

        /**
         * Inverts the sign of the current fraction
         *
         * Ex: new Fraction(-4).neg() => 4
         **/
        "neg": function() {

          return newFraction(-this["s"] * this["n"], this["d"]);
        },

        /**
         * Adds two rational numbers
         *
         * Ex: new Fraction({n: 2, d: 3}).add("14.9") => 467 / 30
         **/
        "add": function(a, b) {

          parse(a, b);
          return newFraction(
            this["s"] * this["n"] * P["d"] + P["s"] * this["d"] * P["n"],
            this["d"] * P["d"]
          );
        },

        /**
         * Subtracts two rational numbers
         *
         * Ex: new Fraction({n: 2, d: 3}).add("14.9") => -427 / 30
         **/
        "sub": function(a, b) {

          parse(a, b);
          return newFraction(
            this["s"] * this["n"] * P["d"] - P["s"] * this["d"] * P["n"],
            this["d"] * P["d"]
          );
        },

        /**
         * Multiplies two rational numbers
         *
         * Ex: new Fraction("-17.(345)").mul(3) => 5776 / 111
         **/
        "mul": function(a, b) {

          parse(a, b);
          return newFraction(
            this["s"] * P["s"] * this["n"] * P["n"],
            this["d"] * P["d"]
          );
        },

        /**
         * Divides two rational numbers
         *
         * Ex: new Fraction("-17.(345)").inverse().div(3)
         **/
        "div": function(a, b) {

          parse(a, b);
          return newFraction(
            this["s"] * P["s"] * this["n"] * P["d"],
            this["d"] * P["n"]
          );
        },

        /**
         * Clones the actual object
         *
         * Ex: new Fraction("-17.(345)").clone()
         **/
        "clone": function() {
          return newFraction(this['s'] * this['n'], this['d']);
        },

        /**
         * Calculates the modulo of two rational numbers - a more precise fmod
         *
         * Ex: new Fraction('4.(3)').mod([7, 8]) => (13/3) % (7/8) = (5/6)
         **/
        "mod": function(a, b) {

          if (isNaN(this['n']) || isNaN(this['d'])) {
            return new Fraction(NaN);
          }

          if (a === undefined) {
            return newFraction(this["s"] * this["n"] % this["d"], 1);
          }

          parse(a, b);
          if (0 === P["n"] && 0 === this["d"]) {
            throw Fraction['DivisionByZero'];
          }

          /*
           * First silly attempt, kinda slow
           *
           return that["sub"]({
           "n": num["n"] * Math.floor((this.n / this.d) / (num.n / num.d)),
           "d": num["d"],
           "s": this["s"]
           });*/

          /*
           * New attempt: a1 / b1 = a2 / b2 * q + r
           * => b2 * a1 = a2 * b1 * q + b1 * b2 * r
           * => (b2 * a1 % a2 * b1) / (b1 * b2)
           */
          return newFraction(
            this["s"] * (P["d"] * this["n"]) % (P["n"] * this["d"]),
            P["d"] * this["d"]
          );
        },

        /**
         * Calculates the fractional gcd of two rational numbers
         *
         * Ex: new Fraction(5,8).gcd(3,7) => 1/56
         */
        "gcd": function(a, b) {

          parse(a, b);

          // gcd(a / b, c / d) = gcd(a, c) / lcm(b, d)

          return newFraction(gcd(P["n"], this["n"]) * gcd(P["d"], this["d"]), P["d"] * this["d"]);
        },

        /**
         * Calculates the fractional lcm of two rational numbers
         *
         * Ex: new Fraction(5,8).lcm(3,7) => 15
         */
        "lcm": function(a, b) {

          parse(a, b);

          // lcm(a / b, c / d) = lcm(a, c) / gcd(b, d)

          if (P["n"] === 0 && this["n"] === 0) {
            return newFraction(0, 1);
          }
          return newFraction(P["n"] * this["n"], gcd(P["n"], this["n"]) * gcd(P["d"], this["d"]));
        },

        /**
         * Calculates the ceil of a rational number
         *
         * Ex: new Fraction('4.(3)').ceil() => (5 / 1)
         **/
        "ceil": function(places) {

          places = Math.pow(10, places || 0);

          if (isNaN(this["n"]) || isNaN(this["d"])) {
            return new Fraction(NaN);
          }
          return newFraction(Math.ceil(places * this["s"] * this["n"] / this["d"]), places);
        },

        /**
         * Calculates the floor of a rational number
         *
         * Ex: new Fraction('4.(3)').floor() => (4 / 1)
         **/
        "floor": function(places) {

          places = Math.pow(10, places || 0);

          if (isNaN(this["n"]) || isNaN(this["d"])) {
            return new Fraction(NaN);
          }
          return newFraction(Math.floor(places * this["s"] * this["n"] / this["d"]), places);
        },

        /**
         * Rounds a rational numbers
         *
         * Ex: new Fraction('4.(3)').round() => (4 / 1)
         **/
        "round": function(places) {

          places = Math.pow(10, places || 0);

          if (isNaN(this["n"]) || isNaN(this["d"])) {
            return new Fraction(NaN);
          }
          return newFraction(Math.round(places * this["s"] * this["n"] / this["d"]), places);
        },

        /**
         * Gets the inverse of the fraction, means numerator and denominator are exchanged
         *
         * Ex: new Fraction([-3, 4]).inverse() => -4 / 3
         **/
        "inverse": function() {

          return newFraction(this["s"] * this["d"], this["n"]);
        },

        /**
         * Calculates the fraction to some rational exponent, if possible
         *
         * Ex: new Fraction(-1,2).pow(-3) => -8
         */
        "pow": function(a, b) {

          parse(a, b);

          // Trivial case when exp is an integer

          if (P['d'] === 1) {

            if (P['s'] < 0) {
              return newFraction(Math.pow(this['s'] * this["d"], P['n']), Math.pow(this["n"], P['n']));
            } else {
              return newFraction(Math.pow(this['s'] * this["n"], P['n']), Math.pow(this["d"], P['n']));
            }
          }

          // Negative roots become complex
          //     (-a/b)^(c/d) = x
          // <=> (-1)^(c/d) * (a/b)^(c/d) = x
          // <=> (cos(pi) + i*sin(pi))^(c/d) * (a/b)^(c/d) = x         # rotate 1 by 180°
          // <=> (cos(c*pi/d) + i*sin(c*pi/d)) * (a/b)^(c/d) = x       # DeMoivre's formula in Q ( https://proofwiki.org/wiki/De_Moivre%27s_Formula/Rational_Index )
          // From which follows that only for c=0 the root is non-complex. c/d is a reduced fraction, so that sin(c/dpi)=0 occurs for d=1, which is handled by our trivial case.
          if (this['s'] < 0) return null;

          // Now prime factor n and d
          var N = factorize(this['n']);
          var D = factorize(this['d']);

          // Exponentiate and take root for n and d individually
          var n = 1;
          var d = 1;
          for (var k in N) {
            if (k === '1') continue;
            if (k === '0') {
              n = 0;
              break;
            }
            N[k]*= P['n'];

            if (N[k] % P['d'] === 0) {
              N[k]/= P['d'];
            } else return null;
            n*= Math.pow(k, N[k]);
          }

          for (var k in D) {
            if (k === '1') continue;
            D[k]*= P['n'];

            if (D[k] % P['d'] === 0) {
              D[k]/= P['d'];
            } else return null;
            d*= Math.pow(k, D[k]);
          }

          if (P['s'] < 0) {
            return newFraction(d, n);
          }
          return newFraction(n, d);
        },

        /**
         * Check if two rational numbers are the same
         *
         * Ex: new Fraction(19.6).equals([98, 5]);
         **/
        "equals": function(a, b) {

          parse(a, b);
          return this["s"] * this["n"] * P["d"] === P["s"] * P["n"] * this["d"]; // Same as compare() === 0
        },

        /**
         * Check if two rational numbers are the same
         *
         * Ex: new Fraction(19.6).equals([98, 5]);
         **/
        "compare": function(a, b) {

          parse(a, b);
          var t = (this["s"] * this["n"] * P["d"] - P["s"] * P["n"] * this["d"]);
          return (0 < t) - (t < 0);
        },

        "simplify": function(eps) {

          if (isNaN(this['n']) || isNaN(this['d'])) {
            return this;
          }

          eps = eps || 0.001;

          var thisABS = this['abs']();
          var cont = thisABS['toContinued']();

          for (var i = 1; i < cont.length; i++) {

            var s = newFraction(cont[i - 1], 1);
            for (var k = i - 2; k >= 0; k--) {
              s = s['inverse']()['add'](cont[k]);
            }

            if (s['sub'](thisABS)['abs']().valueOf() < eps) {
              return s['mul'](this['s']);
            }
          }
          return this;
        },

        /**
         * Check if two rational numbers are divisible
         *
         * Ex: new Fraction(19.6).divisible(1.5);
         */
        "divisible": function(a, b) {

          parse(a, b);
          return !(!(P["n"] * this["d"]) || ((this["n"] * P["d"]) % (P["n"] * this["d"])));
        },

        /**
         * Returns a decimal representation of the fraction
         *
         * Ex: new Fraction("100.'91823'").valueOf() => 100.91823918239183
         **/
        'valueOf': function() {

          return this["s"] * this["n"] / this["d"];
        },

        /**
         * Returns a string-fraction representation of a Fraction object
         *
         * Ex: new Fraction("1.'3'").toFraction(true) => "4 1/3"
         **/
        'toFraction': function(excludeWhole) {

          var whole, str = "";
          var n = this["n"];
          var d = this["d"];
          if (this["s"] < 0) {
            str+= '-';
          }

          if (d === 1) {
            str+= n;
          } else {

            if (excludeWhole && (whole = Math.floor(n / d)) > 0) {
              str+= whole;
              str+= " ";
              n%= d;
            }

            str+= n;
            str+= '/';
            str+= d;
          }
          return str;
        },

        /**
         * Returns a latex representation of a Fraction object
         *
         * Ex: new Fraction("1.'3'").toLatex() => "\frac{4}{3}"
         **/
        'toLatex': function(excludeWhole) {

          var whole, str = "";
          var n = this["n"];
          var d = this["d"];
          if (this["s"] < 0) {
            str+= '-';
          }

          if (d === 1) {
            str+= n;
          } else {

            if (excludeWhole && (whole = Math.floor(n / d)) > 0) {
              str+= whole;
              n%= d;
            }

            str+= "\\frac{";
            str+= n;
            str+= '}{';
            str+= d;
            str+= '}';
          }
          return str;
        },

        /**
         * Returns an array of continued fraction elements
         *
         * Ex: new Fraction("7/8").toContinued() => [0,1,7]
         */
        'toContinued': function() {

          var t;
          var a = this['n'];
          var b = this['d'];
          var res = [];

          if (isNaN(a) || isNaN(b)) {
            return res;
          }

          do {
            res.push(Math.floor(a / b));
            t = a % b;
            a = b;
            b = t;
          } while (a !== 1);

          return res;
        },

        /**
         * Creates a string representation of a fraction with all digits
         *
         * Ex: new Fraction("100.'91823'").toString() => "100.(91823)"
         **/
        'toString': function(dec) {

          var N = this["n"];
          var D = this["d"];

          if (isNaN(N) || isNaN(D)) {
            return "NaN";
          }

          dec = dec || 15; // 15 = decimal places when no repetation

          var cycLen = cycleLen(N, D); // Cycle length
          var cycOff = cycleStart(N, D, cycLen); // Cycle start

          var str = this['s'] < 0 ? "-" : "";

          str+= N / D | 0;

          N%= D;
          N*= 10;

          if (N)
            str+= ".";

          if (cycLen) {

            for (var i = cycOff; i--;) {
              str+= N / D | 0;
              N%= D;
              N*= 10;
            }
            str+= "(";
            for (var i = cycLen; i--;) {
              str+= N / D | 0;
              N%= D;
              N*= 10;
            }
            str+= ")";
          } else {
            for (var i = dec; N && i--;) {
              str+= N / D | 0;
              N%= D;
              N*= 10;
            }
          }
          return str;
        }
      };

      {
        Object.defineProperty(Fraction, "__esModule", { 'value': true });
        Fraction['default'] = Fraction;
        Fraction['Fraction'] = Fraction;
        module['exports'] = Fraction;
      }

    })();
    });

    var Fraction$1 = /*@__PURE__*/getDefaultExportFromCjs(fraction);

    var name$e = 'Fraction';
    var dependencies$e = [];
    var createFractionClass = /* #__PURE__ */factory(name$e, dependencies$e, () => {
      /**
       * Attach type information
       */
      Fraction$1.prototype.type = 'Fraction';
      Fraction$1.prototype.isFraction = true;
      /**
       * Get a JSON representation of a Fraction containing type information
       * @returns {Object} Returns a JSON object structured as:
       *                   `{"mathjs": "Fraction", "n": 3, "d": 8}`
       */

      Fraction$1.prototype.toJSON = function () {
        return {
          mathjs: 'Fraction',
          n: this.s * this.n,
          d: this.d
        };
      };
      /**
       * Instantiate a Fraction from a JSON object
       * @param {Object} json  a JSON object structured as:
       *                       `{"mathjs": "Fraction", "n": 3, "d": 8}`
       * @return {BigNumber}
       */


      Fraction$1.fromJSON = function (json) {
        return new Fraction$1(json);
      };

      return Fraction$1;
    }, {
      isClass: true
    });

    var name$d = 'Matrix';
    var dependencies$d = [];
    var createMatrixClass = /* #__PURE__ */factory(name$d, dependencies$d, () => {
      /**
       * @constructor Matrix
       *
       * A Matrix is a wrapper around an Array. A matrix can hold a multi dimensional
       * array. A matrix can be constructed as:
       *
       *     let matrix = math.matrix(data)
       *
       * Matrix contains the functions to resize, get and set values, get the size,
       * clone the matrix and to convert the matrix to a vector, array, or scalar.
       * Furthermore, one can iterate over the matrix using map and forEach.
       * The internal Array of the Matrix can be accessed using the function valueOf.
       *
       * Example usage:
       *
       *     let matrix = math.matrix([[1, 2], [3, 4]])
       *     matix.size()              // [2, 2]
       *     matrix.resize([3, 2], 5)
       *     matrix.valueOf()          // [[1, 2], [3, 4], [5, 5]]
       *     matrix.subset([1,2])       // 3 (indexes are zero-based)
       *
       */
      function Matrix() {
        if (!(this instanceof Matrix)) {
          throw new SyntaxError('Constructor must be called with the new operator');
        }
      }
      /**
       * Attach type information
       */


      Matrix.prototype.type = 'Matrix';
      Matrix.prototype.isMatrix = true;
      /**
       * Get the storage format used by the matrix.
       *
       * Usage:
       *     const format = matrix.storage()   // retrieve storage format
       *
       * @return {string}           The storage format.
       */

      Matrix.prototype.storage = function () {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke storage on a Matrix interface');
      };
      /**
       * Get the datatype of the data stored in the matrix.
       *
       * Usage:
       *     const format = matrix.datatype()    // retrieve matrix datatype
       *
       * @return {string}           The datatype.
       */


      Matrix.prototype.datatype = function () {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke datatype on a Matrix interface');
      };
      /**
       * Create a new Matrix With the type of the current matrix instance
       * @param {Array | Object} data
       * @param {string} [datatype]
       */


      Matrix.prototype.create = function (data, datatype) {
        throw new Error('Cannot invoke create on a Matrix interface');
      };
      /**
       * Get a subset of the matrix, or replace a subset of the matrix.
       *
       * Usage:
       *     const subset = matrix.subset(index)               // retrieve subset
       *     const value = matrix.subset(index, replacement)   // replace subset
       *
       * @param {Index} index
       * @param {Array | Matrix | *} [replacement]
       * @param {*} [defaultValue=0]      Default value, filled in on new entries when
       *                                  the matrix is resized. If not provided,
       *                                  new matrix elements will be filled with zeros.
       */


      Matrix.prototype.subset = function (index, replacement, defaultValue) {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke subset on a Matrix interface');
      };
      /**
       * Get a single element from the matrix.
       * @param {number[]} index   Zero-based index
       * @return {*} value
       */


      Matrix.prototype.get = function (index) {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke get on a Matrix interface');
      };
      /**
       * Replace a single element in the matrix.
       * @param {number[]} index   Zero-based index
       * @param {*} value
       * @param {*} [defaultValue]        Default value, filled in on new entries when
       *                                  the matrix is resized. If not provided,
       *                                  new matrix elements will be left undefined.
       * @return {Matrix} self
       */


      Matrix.prototype.set = function (index, value, defaultValue) {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke set on a Matrix interface');
      };
      /**
       * Resize the matrix to the given size. Returns a copy of the matrix when
       * `copy=true`, otherwise return the matrix itself (resize in place).
       *
       * @param {number[]} size           The new size the matrix should have.
       * @param {*} [defaultValue=0]      Default value, filled in on new entries.
       *                                  If not provided, the matrix elements will
       *                                  be filled with zeros.
       * @param {boolean} [copy]          Return a resized copy of the matrix
       *
       * @return {Matrix}                 The resized matrix
       */


      Matrix.prototype.resize = function (size, defaultValue) {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke resize on a Matrix interface');
      };
      /**
       * Reshape the matrix to the given size. Returns a copy of the matrix when
       * `copy=true`, otherwise return the matrix itself (reshape in place).
       *
       * @param {number[]} size           The new size the matrix should have.
       * @param {boolean} [copy]          Return a reshaped copy of the matrix
       *
       * @return {Matrix}                 The reshaped matrix
       */


      Matrix.prototype.reshape = function (size, defaultValue) {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke reshape on a Matrix interface');
      };
      /**
       * Create a clone of the matrix
       * @return {Matrix} clone
       */


      Matrix.prototype.clone = function () {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke clone on a Matrix interface');
      };
      /**
       * Retrieve the size of the matrix.
       * @returns {number[]} size
       */


      Matrix.prototype.size = function () {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke size on a Matrix interface');
      };
      /**
       * Create a new matrix with the results of the callback function executed on
       * each entry of the matrix.
       * @param {Function} callback   The callback function is invoked with three
       *                              parameters: the value of the element, the index
       *                              of the element, and the Matrix being traversed.
       * @param {boolean} [skipZeros] Invoke callback function for non-zero values only.
       *
       * @return {Matrix} matrix
       */


      Matrix.prototype.map = function (callback, skipZeros) {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke map on a Matrix interface');
      };
      /**
       * Execute a callback function on each entry of the matrix.
       * @param {Function} callback   The callback function is invoked with three
       *                              parameters: the value of the element, the index
       *                              of the element, and the Matrix being traversed.
       */


      Matrix.prototype.forEach = function (callback) {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke forEach on a Matrix interface');
      };
      /**
       * Iterate over the matrix elements
       * @return {Iterable<{ value, index: number[] }>}
       */


      Matrix.prototype[Symbol.iterator] = function () {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot iterate a Matrix interface');
      };
      /**
       * Create an Array with a copy of the data of the Matrix
       * @returns {Array} array
       */


      Matrix.prototype.toArray = function () {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke toArray on a Matrix interface');
      };
      /**
       * Get the primitive value of the Matrix: a multidimensional array
       * @returns {Array} array
       */


      Matrix.prototype.valueOf = function () {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke valueOf on a Matrix interface');
      };
      /**
       * Get a string representation of the matrix, with optional formatting options.
       * @param {Object | number | Function} [options]  Formatting options. See
       *                                                lib/utils/number:format for a
       *                                                description of the available
       *                                                options.
       * @returns {string} str
       */


      Matrix.prototype.format = function (options) {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke format on a Matrix interface');
      };
      /**
       * Get a string representation of the matrix
       * @returns {string} str
       */


      Matrix.prototype.toString = function () {
        // must be implemented by each of the Matrix implementations
        throw new Error('Cannot invoke toString on a Matrix interface');
      };

      return Matrix;
    }, {
      isClass: true
    });

    var name$c = 'DenseMatrix';
    var dependencies$c = ['Matrix'];
    var createDenseMatrixClass = /* #__PURE__ */factory(name$c, dependencies$c, _ref => {
      var {
        Matrix
      } = _ref;

      /**
       * Dense Matrix implementation. A regular, dense matrix, supporting multi-dimensional matrices. This is the default matrix type.
       * @class DenseMatrix
       * @enum {{ value, index: number[] }}
       */
      function DenseMatrix(data, datatype) {
        if (!(this instanceof DenseMatrix)) {
          throw new SyntaxError('Constructor must be called with the new operator');
        }

        if (datatype && !isString(datatype)) {
          throw new Error('Invalid datatype: ' + datatype);
        }

        if (isMatrix(data)) {
          // check data is a DenseMatrix
          if (data.type === 'DenseMatrix') {
            // clone data & size
            this._data = clone(data._data);
            this._size = clone(data._size);
            this._datatype = datatype || data._datatype;
          } else {
            // build data from existing matrix
            this._data = data.toArray();
            this._size = data.size();
            this._datatype = datatype || data._datatype;
          }
        } else if (data && isArray(data.data) && isArray(data.size)) {
          // initialize fields from JSON representation
          this._data = data.data;
          this._size = data.size; // verify the dimensions of the array

          validate(this._data, this._size);
          this._datatype = datatype || data.datatype;
        } else if (isArray(data)) {
          // replace nested Matrices with Arrays
          this._data = preprocess(data); // get the dimensions of the array

          this._size = arraySize(this._data); // verify the dimensions of the array, TODO: compute size while processing array

          validate(this._data, this._size); // data type unknown

          this._datatype = datatype;
        } else if (data) {
          // unsupported type
          throw new TypeError('Unsupported type of data (' + typeOf(data) + ')');
        } else {
          // nothing provided
          this._data = [];
          this._size = [0];
          this._datatype = datatype;
        }
      }

      DenseMatrix.prototype = new Matrix();
      /**
       * Create a new DenseMatrix
       */

      DenseMatrix.prototype.createDenseMatrix = function (data, datatype) {
        return new DenseMatrix(data, datatype);
      };
      /**
       * Attach type information
       */


      DenseMatrix.prototype.type = 'DenseMatrix';
      DenseMatrix.prototype.isDenseMatrix = true;
      /**
       * Get the matrix type
       *
       * Usage:
       *    const matrixType = matrix.getDataType()  // retrieves the matrix type
       *
       * @memberOf DenseMatrix
       * @return {string}   type information; if multiple types are found from the Matrix, it will return "mixed"
       */

      DenseMatrix.prototype.getDataType = function () {
        return getArrayDataType(this._data, typeOf);
      };
      /**
       * Get the storage format used by the matrix.
       *
       * Usage:
       *     const format = matrix.storage()  // retrieve storage format
       *
       * @memberof DenseMatrix
       * @return {string}           The storage format.
       */


      DenseMatrix.prototype.storage = function () {
        return 'dense';
      };
      /**
       * Get the datatype of the data stored in the matrix.
       *
       * Usage:
       *     const format = matrix.datatype()   // retrieve matrix datatype
       *
       * @memberof DenseMatrix
       * @return {string}           The datatype.
       */


      DenseMatrix.prototype.datatype = function () {
        return this._datatype;
      };
      /**
       * Create a new DenseMatrix
       * @memberof DenseMatrix
       * @param {Array} data
       * @param {string} [datatype]
       */


      DenseMatrix.prototype.create = function (data, datatype) {
        return new DenseMatrix(data, datatype);
      };
      /**
       * Get a subset of the matrix, or replace a subset of the matrix.
       *
       * Usage:
       *     const subset = matrix.subset(index)               // retrieve subset
       *     const value = matrix.subset(index, replacement)   // replace subset
       *
       * @memberof DenseMatrix
       * @param {Index} index
       * @param {Array | Matrix | *} [replacement]
       * @param {*} [defaultValue=0]      Default value, filled in on new entries when
       *                                  the matrix is resized. If not provided,
       *                                  new matrix elements will be filled with zeros.
       */


      DenseMatrix.prototype.subset = function (index, replacement, defaultValue) {
        switch (arguments.length) {
          case 1:
            return _get(this, index);
          // intentional fall through

          case 2:
          case 3:
            return _set(this, index, replacement, defaultValue);

          default:
            throw new SyntaxError('Wrong number of arguments');
        }
      };
      /**
       * Get a single element from the matrix.
       * @memberof DenseMatrix
       * @param {number[]} index   Zero-based index
       * @return {*} value
       */


      DenseMatrix.prototype.get = function (index) {
        if (!isArray(index)) {
          throw new TypeError('Array expected');
        }

        if (index.length !== this._size.length) {
          throw new DimensionError(index.length, this._size.length);
        } // check index


        for (var x = 0; x < index.length; x++) {
          validateIndex(index[x], this._size[x]);
        }

        var data = this._data;

        for (var i = 0, ii = index.length; i < ii; i++) {
          var indexI = index[i];
          validateIndex(indexI, data.length);
          data = data[indexI];
        }

        return data;
      };
      /**
       * Replace a single element in the matrix.
       * @memberof DenseMatrix
       * @param {number[]} index   Zero-based index
       * @param {*} value
       * @param {*} [defaultValue]        Default value, filled in on new entries when
       *                                  the matrix is resized. If not provided,
       *                                  new matrix elements will be left undefined.
       * @return {DenseMatrix} self
       */


      DenseMatrix.prototype.set = function (index, value, defaultValue) {
        if (!isArray(index)) {
          throw new TypeError('Array expected');
        }

        if (index.length < this._size.length) {
          throw new DimensionError(index.length, this._size.length, '<');
        }

        var i, ii, indexI; // enlarge matrix when needed

        var size = index.map(function (i) {
          return i + 1;
        });

        _fit(this, size, defaultValue); // traverse over the dimensions


        var data = this._data;

        for (i = 0, ii = index.length - 1; i < ii; i++) {
          indexI = index[i];
          validateIndex(indexI, data.length);
          data = data[indexI];
        } // set new value


        indexI = index[index.length - 1];
        validateIndex(indexI, data.length);
        data[indexI] = value;
        return this;
      };
      /**
       * Get a submatrix of this matrix
       * @memberof DenseMatrix
       * @param {DenseMatrix} matrix
       * @param {Index} index   Zero-based index
       * @private
       */


      function _get(matrix, index) {
        if (!isIndex(index)) {
          throw new TypeError('Invalid index');
        }

        var isScalar = index.isScalar();

        if (isScalar) {
          // return a scalar
          return matrix.get(index.min());
        } else {
          // validate dimensions
          var size = index.size();

          if (size.length !== matrix._size.length) {
            throw new DimensionError(size.length, matrix._size.length);
          } // validate if any of the ranges in the index is out of range


          var min = index.min();
          var max = index.max();

          for (var i = 0, ii = matrix._size.length; i < ii; i++) {
            validateIndex(min[i], matrix._size[i]);
            validateIndex(max[i], matrix._size[i]);
          } // retrieve submatrix
          // TODO: more efficient when creating an empty matrix and setting _data and _size manually


          return new DenseMatrix(_getSubmatrix(matrix._data, index, size.length, 0), matrix._datatype);
        }
      }
      /**
       * Recursively get a submatrix of a multi dimensional matrix.
       * Index is not checked for correct number or length of dimensions.
       * @memberof DenseMatrix
       * @param {Array} data
       * @param {Index} index
       * @param {number} dims   Total number of dimensions
       * @param {number} dim    Current dimension
       * @return {Array} submatrix
       * @private
       */


      function _getSubmatrix(data, index, dims, dim) {
        var last = dim === dims - 1;
        var range = index.dimension(dim);

        if (last) {
          return range.map(function (i) {
            validateIndex(i, data.length);
            return data[i];
          }).valueOf();
        } else {
          return range.map(function (i) {
            validateIndex(i, data.length);
            var child = data[i];
            return _getSubmatrix(child, index, dims, dim + 1);
          }).valueOf();
        }
      }
      /**
       * Replace a submatrix in this matrix
       * Indexes are zero-based.
       * @memberof DenseMatrix
       * @param {DenseMatrix} matrix
       * @param {Index} index
       * @param {DenseMatrix | Array | *} submatrix
       * @param {*} defaultValue          Default value, filled in on new entries when
       *                                  the matrix is resized.
       * @return {DenseMatrix} matrix
       * @private
       */


      function _set(matrix, index, submatrix, defaultValue) {
        if (!index || index.isIndex !== true) {
          throw new TypeError('Invalid index');
        } // get index size and check whether the index contains a single value


        var iSize = index.size();
        var isScalar = index.isScalar(); // calculate the size of the submatrix, and convert it into an Array if needed

        var sSize;

        if (isMatrix(submatrix)) {
          sSize = submatrix.size();
          submatrix = submatrix.valueOf();
        } else {
          sSize = arraySize(submatrix);
        }

        if (isScalar) {
          // set a scalar
          // check whether submatrix is a scalar
          if (sSize.length !== 0) {
            throw new TypeError('Scalar expected');
          }

          matrix.set(index.min(), submatrix, defaultValue);
        } else {
          // set a submatrix
          // validate dimensions
          if (iSize.length < matrix._size.length) {
            throw new DimensionError(iSize.length, matrix._size.length, '<');
          }

          if (sSize.length < iSize.length) {
            // calculate number of missing outer dimensions
            var i = 0;
            var outer = 0;

            while (iSize[i] === 1 && sSize[i] === 1) {
              i++;
            }

            while (iSize[i] === 1) {
              outer++;
              i++;
            } // unsqueeze both outer and inner dimensions


            submatrix = unsqueeze(submatrix, iSize.length, outer, sSize);
          } // check whether the size of the submatrix matches the index size


          if (!deepStrictEqual(iSize, sSize)) {
            throw new DimensionError(iSize, sSize, '>');
          } // enlarge matrix when needed


          var size = index.max().map(function (i) {
            return i + 1;
          });

          _fit(matrix, size, defaultValue); // insert the sub matrix


          var dims = iSize.length;
          var dim = 0;

          _setSubmatrix(matrix._data, index, submatrix, dims, dim);
        }

        return matrix;
      }
      /**
       * Replace a submatrix of a multi dimensional matrix.
       * @memberof DenseMatrix
       * @param {Array} data
       * @param {Index} index
       * @param {Array} submatrix
       * @param {number} dims   Total number of dimensions
       * @param {number} dim
       * @private
       */


      function _setSubmatrix(data, index, submatrix, dims, dim) {
        var last = dim === dims - 1;
        var range = index.dimension(dim);

        if (last) {
          range.forEach(function (dataIndex, subIndex) {
            validateIndex(dataIndex);
            data[dataIndex] = submatrix[subIndex[0]];
          });
        } else {
          range.forEach(function (dataIndex, subIndex) {
            validateIndex(dataIndex);

            _setSubmatrix(data[dataIndex], index, submatrix[subIndex[0]], dims, dim + 1);
          });
        }
      }
      /**
       * Resize the matrix to the given size. Returns a copy of the matrix when
       * `copy=true`, otherwise return the matrix itself (resize in place).
       *
       * @memberof DenseMatrix
       * @param {number[] || Matrix} size The new size the matrix should have.
       * @param {*} [defaultValue=0]      Default value, filled in on new entries.
       *                                  If not provided, the matrix elements will
       *                                  be filled with zeros.
       * @param {boolean} [copy]          Return a resized copy of the matrix
       *
       * @return {Matrix}                 The resized matrix
       */


      DenseMatrix.prototype.resize = function (size, defaultValue, copy) {
        // validate arguments
        if (!isCollection(size)) {
          throw new TypeError('Array or Matrix expected');
        } // SparseMatrix input is always 2d, flatten this into 1d if it's indeed a vector


        var sizeArray = size.valueOf().map(value => {
          return Array.isArray(value) && value.length === 1 ? value[0] : value;
        }); // matrix to resize

        var m = copy ? this.clone() : this; // resize matrix

        return _resize(m, sizeArray, defaultValue);
      };

      function _resize(matrix, size, defaultValue) {
        // check size
        if (size.length === 0) {
          // first value in matrix
          var v = matrix._data; // go deep

          while (isArray(v)) {
            v = v[0];
          }

          return v;
        } // resize matrix


        matrix._size = size.slice(0); // copy the array

        matrix._data = resize(matrix._data, matrix._size, defaultValue); // return matrix

        return matrix;
      }
      /**
       * Reshape the matrix to the given size. Returns a copy of the matrix when
       * `copy=true`, otherwise return the matrix itself (reshape in place).
       *
       * NOTE: This might be better suited to copy by default, instead of modifying
       *       in place. For now, it operates in place to remain consistent with
       *       resize().
       *
       * @memberof DenseMatrix
       * @param {number[]} size           The new size the matrix should have.
       * @param {boolean} [copy]          Return a reshaped copy of the matrix
       *
       * @return {Matrix}                 The reshaped matrix
       */


      DenseMatrix.prototype.reshape = function (size, copy) {
        var m = copy ? this.clone() : this;
        m._data = reshape(m._data, size);

        var currentLength = m._size.reduce((length, size) => length * size);

        m._size = processSizesWildcard(size, currentLength);
        return m;
      };
      /**
       * Enlarge the matrix when it is smaller than given size.
       * If the matrix is larger or equal sized, nothing is done.
       * @memberof DenseMatrix
       * @param {DenseMatrix} matrix           The matrix to be resized
       * @param {number[]} size
       * @param {*} defaultValue          Default value, filled in on new entries.
       * @private
       */


      function _fit(matrix, size, defaultValue) {
        var // copy the array
        newSize = matrix._size.slice(0);

        var changed = false; // add dimensions when needed

        while (newSize.length < size.length) {
          newSize.push(0);
          changed = true;
        } // enlarge size when needed


        for (var i = 0, ii = size.length; i < ii; i++) {
          if (size[i] > newSize[i]) {
            newSize[i] = size[i];
            changed = true;
          }
        }

        if (changed) {
          // resize only when size is changed
          _resize(matrix, newSize, defaultValue);
        }
      }
      /**
       * Create a clone of the matrix
       * @memberof DenseMatrix
       * @return {DenseMatrix} clone
       */


      DenseMatrix.prototype.clone = function () {
        var m = new DenseMatrix({
          data: clone(this._data),
          size: clone(this._size),
          datatype: this._datatype
        });
        return m;
      };
      /**
       * Retrieve the size of the matrix.
       * @memberof DenseMatrix
       * @returns {number[]} size
       */


      DenseMatrix.prototype.size = function () {
        return this._size.slice(0); // return a clone of _size
      };
      /**
       * Create a new matrix with the results of the callback function executed on
       * each entry of the matrix.
       * @memberof DenseMatrix
       * @param {Function} callback   The callback function is invoked with three
       *                              parameters: the value of the element, the index
       *                              of the element, and the Matrix being traversed.
       *
       * @return {DenseMatrix} matrix
       */


      DenseMatrix.prototype.map = function (callback) {
        // matrix instance
        var me = this;

        var recurse = function recurse(value, index) {
          if (isArray(value)) {
            return value.map(function (child, i) {
              return recurse(child, index.concat(i));
            });
          } else {
            return callback(value, index, me);
          }
        }; // determine the new datatype when the original matrix has datatype defined
        // TODO: should be done in matrix constructor instead


        var data = recurse(this._data, []);
        var datatype = this._datatype !== undefined ? getArrayDataType(data, typeOf) : undefined;
        return new DenseMatrix(data, datatype);
      };
      /**
       * Execute a callback function on each entry of the matrix.
       * @memberof DenseMatrix
       * @param {Function} callback   The callback function is invoked with three
       *                              parameters: the value of the element, the index
       *                              of the element, and the Matrix being traversed.
       */


      DenseMatrix.prototype.forEach = function (callback) {
        // matrix instance
        var me = this;

        var recurse = function recurse(value, index) {
          if (isArray(value)) {
            value.forEach(function (child, i) {
              recurse(child, index.concat(i));
            });
          } else {
            callback(value, index, me);
          }
        };

        recurse(this._data, []);
      };
      /**
       * Iterate over the matrix elements
       * @return {Iterable<{ value, index: number[] }>}
       */


      DenseMatrix.prototype[Symbol.iterator] = function* () {
        var recurse = function* recurse(value, index) {
          if (isArray(value)) {
            for (var i = 0; i < value.length; i++) {
              yield* recurse(value[i], index.concat(i));
            }
          } else {
            yield {
              value,
              index
            };
          }
        };

        yield* recurse(this._data, []);
      };
      /**
       * Returns an array containing the rows of a 2D matrix
       * @returns {Array<Matrix>}
       */


      DenseMatrix.prototype.rows = function () {
        var result = [];
        var s = this.size();

        if (s.length !== 2) {
          throw new TypeError('Rows can only be returned for a 2D matrix.');
        }

        var data = this._data;

        for (var row of data) {
          result.push(new DenseMatrix([row], this._datatype));
        }

        return result;
      };
      /**
       * Returns an array containing the columns of a 2D matrix
       * @returns {Array<Matrix>}
       */


      DenseMatrix.prototype.columns = function () {
        var _this = this;

        var result = [];
        var s = this.size();

        if (s.length !== 2) {
          throw new TypeError('Rows can only be returned for a 2D matrix.');
        }

        var data = this._data;

        var _loop = function _loop(i) {
          var col = data.map(row => [row[i]]);
          result.push(new DenseMatrix(col, _this._datatype));
        };

        for (var i = 0; i < s[1]; i++) {
          _loop(i);
        }

        return result;
      };
      /**
       * Create an Array with a copy of the data of the DenseMatrix
       * @memberof DenseMatrix
       * @returns {Array} array
       */


      DenseMatrix.prototype.toArray = function () {
        return clone(this._data);
      };
      /**
       * Get the primitive value of the DenseMatrix: a multidimensional array
       * @memberof DenseMatrix
       * @returns {Array} array
       */


      DenseMatrix.prototype.valueOf = function () {
        return this._data;
      };
      /**
       * Get a string representation of the matrix, with optional formatting options.
       * @memberof DenseMatrix
       * @param {Object | number | Function} [options]  Formatting options. See
       *                                                lib/utils/number:format for a
       *                                                description of the available
       *                                                options.
       * @returns {string} str
       */


      DenseMatrix.prototype.format = function (options) {
        return format(this._data, options);
      };
      /**
       * Get a string representation of the matrix
       * @memberof DenseMatrix
       * @returns {string} str
       */


      DenseMatrix.prototype.toString = function () {
        return format(this._data);
      };
      /**
       * Get a JSON representation of the matrix
       * @memberof DenseMatrix
       * @returns {Object}
       */


      DenseMatrix.prototype.toJSON = function () {
        return {
          mathjs: 'DenseMatrix',
          data: this._data,
          size: this._size,
          datatype: this._datatype
        };
      };
      /**
       * Get the kth Matrix diagonal.
       *
       * @memberof DenseMatrix
       * @param {number | BigNumber} [k=0]     The kth diagonal where the vector will retrieved.
       *
       * @returns {Matrix}                     The matrix with the diagonal values.
       */


      DenseMatrix.prototype.diagonal = function (k) {
        // validate k if any
        if (k) {
          // convert BigNumber to a number
          if (isBigNumber(k)) {
            k = k.toNumber();
          } // is must be an integer


          if (!isNumber(k) || !isInteger(k)) {
            throw new TypeError('The parameter k must be an integer number');
          }
        } else {
          // default value
          k = 0;
        }

        var kSuper = k > 0 ? k : 0;
        var kSub = k < 0 ? -k : 0; // rows & columns

        var rows = this._size[0];
        var columns = this._size[1]; // number diagonal values

        var n = Math.min(rows - kSub, columns - kSuper); // x is a matrix get diagonal from matrix

        var data = []; // loop rows

        for (var i = 0; i < n; i++) {
          data[i] = this._data[i + kSub][i + kSuper];
        } // create DenseMatrix


        return new DenseMatrix({
          data: data,
          size: [n],
          datatype: this._datatype
        });
      };
      /**
       * Create a diagonal matrix.
       *
       * @memberof DenseMatrix
       * @param {Array} size                     The matrix size.
       * @param {number | Matrix | Array } value The values for the diagonal.
       * @param {number | BigNumber} [k=0]       The kth diagonal where the vector will be filled in.
       * @param {number} [defaultValue]          The default value for non-diagonal
       * @param {string} [datatype]              The datatype for the diagonal
       *
       * @returns {DenseMatrix}
       */


      DenseMatrix.diagonal = function (size, value, k, defaultValue) {
        if (!isArray(size)) {
          throw new TypeError('Array expected, size parameter');
        }

        if (size.length !== 2) {
          throw new Error('Only two dimensions matrix are supported');
        } // map size & validate


        size = size.map(function (s) {
          // check it is a big number
          if (isBigNumber(s)) {
            // convert it
            s = s.toNumber();
          } // validate arguments


          if (!isNumber(s) || !isInteger(s) || s < 1) {
            throw new Error('Size values must be positive integers');
          }

          return s;
        }); // validate k if any

        if (k) {
          // convert BigNumber to a number
          if (isBigNumber(k)) {
            k = k.toNumber();
          } // is must be an integer


          if (!isNumber(k) || !isInteger(k)) {
            throw new TypeError('The parameter k must be an integer number');
          }
        } else {
          // default value
          k = 0;
        }

        var kSuper = k > 0 ? k : 0;
        var kSub = k < 0 ? -k : 0; // rows and columns

        var rows = size[0];
        var columns = size[1]; // number of non-zero items

        var n = Math.min(rows - kSub, columns - kSuper); // value extraction function

        var _value; // check value


        if (isArray(value)) {
          // validate array
          if (value.length !== n) {
            // number of values in array must be n
            throw new Error('Invalid value array length');
          } // define function


          _value = function _value(i) {
            // return value @ i
            return value[i];
          };
        } else if (isMatrix(value)) {
          // matrix size
          var ms = value.size(); // validate matrix

          if (ms.length !== 1 || ms[0] !== n) {
            // number of values in array must be n
            throw new Error('Invalid matrix length');
          } // define function


          _value = function _value(i) {
            // return value @ i
            return value.get([i]);
          };
        } else {
          // define function
          _value = function _value() {
            // return value
            return value;
          };
        } // discover default value if needed


        if (!defaultValue) {
          // check first value in array
          defaultValue = isBigNumber(_value(0)) ? _value(0).mul(0) // trick to create a BigNumber with value zero
          : 0;
        } // empty array


        var data = []; // check we need to resize array

        if (size.length > 0) {
          // resize array
          data = resize(data, size, defaultValue); // fill diagonal

          for (var d = 0; d < n; d++) {
            data[d + kSub][d + kSuper] = _value(d);
          }
        } // create DenseMatrix


        return new DenseMatrix({
          data: data,
          size: [rows, columns]
        });
      };
      /**
       * Generate a matrix from a JSON object
       * @memberof DenseMatrix
       * @param {Object} json  An object structured like
       *                       `{"mathjs": "DenseMatrix", data: [], size: []}`,
       *                       where mathjs is optional
       * @returns {DenseMatrix}
       */


      DenseMatrix.fromJSON = function (json) {
        return new DenseMatrix(json);
      };
      /**
       * Swap rows i and j in Matrix.
       *
       * @memberof DenseMatrix
       * @param {number} i       Matrix row index 1
       * @param {number} j       Matrix row index 2
       *
       * @return {Matrix}        The matrix reference
       */


      DenseMatrix.prototype.swapRows = function (i, j) {
        // check index
        if (!isNumber(i) || !isInteger(i) || !isNumber(j) || !isInteger(j)) {
          throw new Error('Row index must be positive integers');
        } // check dimensions


        if (this._size.length !== 2) {
          throw new Error('Only two dimensional matrix is supported');
        } // validate index


        validateIndex(i, this._size[0]);
        validateIndex(j, this._size[0]); // swap rows

        DenseMatrix._swapRows(i, j, this._data); // return current instance


        return this;
      };
      /**
       * Swap rows i and j in Dense Matrix data structure.
       *
       * @param {number} i       Matrix row index 1
       * @param {number} j       Matrix row index 2
       * @param {Array} data     Matrix data
       */


      DenseMatrix._swapRows = function (i, j, data) {
        // swap values i <-> j
        var vi = data[i];
        data[i] = data[j];
        data[j] = vi;
      };
      /**
       * Preprocess data, which can be an Array or DenseMatrix with nested Arrays and
       * Matrices. Replaces all nested Matrices with Arrays
       * @memberof DenseMatrix
       * @param {Array} data
       * @return {Array} data
       */


      function preprocess(data) {
        for (var i = 0, ii = data.length; i < ii; i++) {
          var elem = data[i];

          if (isArray(elem)) {
            data[i] = preprocess(elem);
          } else if (elem && elem.isMatrix === true) {
            data[i] = preprocess(elem.valueOf());
          }
        }

        return data;
      }

      return DenseMatrix;
    }, {
      isClass: true
    });

    /**
     * Execute the callback function element wise for each element in array and any
     * nested array
     * Returns an array with the results
     * @param {Array | Matrix} array
     * @param {Function} callback   The callback is called with two parameters:
     *                              value1 and value2, which contain the current
     *                              element of both arrays.
     * @param {boolean} [skipZeros] Invoke callback function for non-zero values only.
     *
     * @return {Array | Matrix} res
     */

    function deepMap(array, callback, skipZeros) {
      if (array && typeof array.map === 'function') {
        // TODO: replace array.map with a for loop to improve performance
        return array.map(function (x) {
          return deepMap(x, callback);
        });
      } else {
        return callback(array);
      }
    }

    var n2 = 'number, number';
    /**
     * round a number to the given number of decimals, or to zero if decimals is
     * not provided
     * @param {number} value
     * @param {number} decimals       number of decimals, between 0 and 15 (0 by default)
     * @return {number} roundedValue
     */

    function roundNumber(value) {
      var decimals = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      return parseFloat(toFixed$1(value, decimals));
    }
    roundNumber.signature = n2;

    /**
     * Compares two BigNumbers.
     * @param {BigNumber} x       First value to compare
     * @param {BigNumber} y       Second value to compare
     * @param {number} [epsilon]  The maximum relative difference between x and y
     *                            If epsilon is undefined or null, the function will
     *                            test whether x and y are exactly equal.
     * @return {boolean} whether the two numbers are nearly equal
     */
    function nearlyEqual(x, y, epsilon) {
      // if epsilon is null or undefined, test whether x and y are exactly equal
      if (epsilon === null || epsilon === undefined) {
        return x.eq(y);
      } // use "==" operator, handles infinities


      if (x.eq(y)) {
        return true;
      } // NaN


      if (x.isNaN() || y.isNaN()) {
        return false;
      } // at this point x and y should be finite


      if (x.isFinite() && y.isFinite()) {
        // check numbers are very close, needed when comparing numbers near zero
        var diff = x.minus(y).abs();

        if (diff.isZero()) {
          return true;
        } else {
          // use relative error
          var max = x.constructor.max(x.abs(), y.abs());
          return diff.lte(max.times(epsilon));
        }
      } // Infinite and Number or negative Infinite and positive Infinite cases


      return false;
    }

    /**
     * Test whether two complex values are equal provided a given epsilon.
     * Does not use or change the global Complex.EPSILON setting
     * @param {Complex} x
     * @param {Complex} y
     * @param {number} epsilon
     * @returns {boolean}
     */

    function complexEquals(x, y, epsilon) {
      return nearlyEqual$1(x.re, y.re, epsilon) && nearlyEqual$1(x.im, y.im, epsilon);
    }

    var name$b = 'equalScalar';
    var dependencies$b = ['typed', 'config'];
    var createEqualScalar = /* #__PURE__ */factory(name$b, dependencies$b, _ref => {
      var {
        typed,
        config
      } = _ref;

      /**
       * Test whether two scalar values are nearly equal.
       *
       * @param  {number | BigNumber | Fraction | boolean | Complex | Unit} x   First value to compare
       * @param  {number | BigNumber | Fraction | boolean | Complex} y          Second value to compare
       * @return {boolean}                                                  Returns true when the compared values are equal, else returns false
       * @private
       */
      return typed(name$b, {
        'boolean, boolean': function booleanBoolean(x, y) {
          return x === y;
        },
        'number, number': function numberNumber(x, y) {
          return nearlyEqual$1(x, y, config.epsilon);
        },
        'BigNumber, BigNumber': function BigNumberBigNumber(x, y) {
          return x.eq(y) || nearlyEqual(x, y, config.epsilon);
        },
        'Fraction, Fraction': function FractionFraction(x, y) {
          return x.equals(y);
        },
        'Complex, Complex': function ComplexComplex(x, y) {
          return complexEquals(x, y, config.epsilon);
        },
        'Unit, Unit': function UnitUnit(x, y) {
          if (!x.equalBase(y)) {
            throw new Error('Cannot compare units with different base');
          }

          return this(x.value, y.value);
        }
      });
    });
    factory(name$b, ['typed', 'config'], _ref2 => {
      var {
        typed,
        config
      } = _ref2;
      return typed(name$b, {
        'number, number': function numberNumber(x, y) {
          return nearlyEqual$1(x, y, config.epsilon);
        }
      });
    });

    var name$a = 'SparseMatrix';
    var dependencies$a = ['typed', 'equalScalar', 'Matrix'];
    var createSparseMatrixClass = /* #__PURE__ */factory(name$a, dependencies$a, _ref => {
      var {
        typed,
        equalScalar,
        Matrix
      } = _ref;

      /**
       * Sparse Matrix implementation. This type implements
       * a [Compressed Column Storage](https://en.wikipedia.org/wiki/Sparse_matrix#Compressed_sparse_column_(CSC_or_CCS))
       * format for two-dimensional sparse matrices.
       * @class SparseMatrix
       */
      function SparseMatrix(data, datatype) {
        if (!(this instanceof SparseMatrix)) {
          throw new SyntaxError('Constructor must be called with the new operator');
        }

        if (datatype && !isString(datatype)) {
          throw new Error('Invalid datatype: ' + datatype);
        }

        if (isMatrix(data)) {
          // create from matrix
          _createFromMatrix(this, data, datatype);
        } else if (data && isArray(data.index) && isArray(data.ptr) && isArray(data.size)) {
          // initialize fields
          this._values = data.values;
          this._index = data.index;
          this._ptr = data.ptr;
          this._size = data.size;
          this._datatype = datatype || data.datatype;
        } else if (isArray(data)) {
          // create from array
          _createFromArray(this, data, datatype);
        } else if (data) {
          // unsupported type
          throw new TypeError('Unsupported type of data (' + typeOf(data) + ')');
        } else {
          // nothing provided
          this._values = [];
          this._index = [];
          this._ptr = [0];
          this._size = [0, 0];
          this._datatype = datatype;
        }
      }

      function _createFromMatrix(matrix, source, datatype) {
        // check matrix type
        if (source.type === 'SparseMatrix') {
          // clone arrays
          matrix._values = source._values ? clone(source._values) : undefined;
          matrix._index = clone(source._index);
          matrix._ptr = clone(source._ptr);
          matrix._size = clone(source._size);
          matrix._datatype = datatype || source._datatype;
        } else {
          // build from matrix data
          _createFromArray(matrix, source.valueOf(), datatype || source._datatype);
        }
      }

      function _createFromArray(matrix, data, datatype) {
        // initialize fields
        matrix._values = [];
        matrix._index = [];
        matrix._ptr = [];
        matrix._datatype = datatype; // discover rows & columns, do not use math.size() to avoid looping array twice

        var rows = data.length;
        var columns = 0; // equal signature to use

        var eq = equalScalar; // zero value

        var zero = 0;

        if (isString(datatype)) {
          // find signature that matches (datatype, datatype)
          eq = typed.find(equalScalar, [datatype, datatype]) || equalScalar; // convert 0 to the same datatype

          zero = typed.convert(0, datatype);
        } // check we have rows (empty array)


        if (rows > 0) {
          // column index
          var j = 0;

          do {
            // store pointer to values index
            matrix._ptr.push(matrix._index.length); // loop rows


            for (var i = 0; i < rows; i++) {
              // current row
              var row = data[i]; // check row is an array

              if (isArray(row)) {
                // update columns if needed (only on first column)
                if (j === 0 && columns < row.length) {
                  columns = row.length;
                } // check row has column


                if (j < row.length) {
                  // value
                  var v = row[j]; // check value != 0

                  if (!eq(v, zero)) {
                    // store value
                    matrix._values.push(v); // index


                    matrix._index.push(i);
                  }
                }
              } else {
                // update columns if needed (only on first column)
                if (j === 0 && columns < 1) {
                  columns = 1;
                } // check value != 0 (row is a scalar)


                if (!eq(row, zero)) {
                  // store value
                  matrix._values.push(row); // index


                  matrix._index.push(i);
                }
              }
            } // increment index


            j++;
          } while (j < columns);
        } // store number of values in ptr


        matrix._ptr.push(matrix._index.length); // size


        matrix._size = [rows, columns];
      }

      SparseMatrix.prototype = new Matrix();
      /**
       * Create a new SparseMatrix
       */

      SparseMatrix.prototype.createSparseMatrix = function (data, datatype) {
        return new SparseMatrix(data, datatype);
      };
      /**
       * Attach type information
       */


      SparseMatrix.prototype.type = 'SparseMatrix';
      SparseMatrix.prototype.isSparseMatrix = true;
      /**
       * Get the matrix type
       *
       * Usage:
       *    const matrixType = matrix.getDataType()  // retrieves the matrix type
       *
       * @memberOf SparseMatrix
       * @return {string}   type information; if multiple types are found from the Matrix, it will return "mixed"
       */

      SparseMatrix.prototype.getDataType = function () {
        return getArrayDataType(this._values, typeOf);
      };
      /**
       * Get the storage format used by the matrix.
       *
       * Usage:
       *     const format = matrix.storage()   // retrieve storage format
       *
       * @memberof SparseMatrix
       * @return {string}           The storage format.
       */


      SparseMatrix.prototype.storage = function () {
        return 'sparse';
      };
      /**
       * Get the datatype of the data stored in the matrix.
       *
       * Usage:
       *     const format = matrix.datatype()    // retrieve matrix datatype
       *
       * @memberof SparseMatrix
       * @return {string}           The datatype.
       */


      SparseMatrix.prototype.datatype = function () {
        return this._datatype;
      };
      /**
       * Create a new SparseMatrix
       * @memberof SparseMatrix
       * @param {Array} data
       * @param {string} [datatype]
       */


      SparseMatrix.prototype.create = function (data, datatype) {
        return new SparseMatrix(data, datatype);
      };
      /**
       * Get the matrix density.
       *
       * Usage:
       *     const density = matrix.density()                   // retrieve matrix density
       *
       * @memberof SparseMatrix
       * @return {number}           The matrix density.
       */


      SparseMatrix.prototype.density = function () {
        // rows & columns
        var rows = this._size[0];
        var columns = this._size[1]; // calculate density

        return rows !== 0 && columns !== 0 ? this._index.length / (rows * columns) : 0;
      };
      /**
       * Get a subset of the matrix, or replace a subset of the matrix.
       *
       * Usage:
       *     const subset = matrix.subset(index)               // retrieve subset
       *     const value = matrix.subset(index, replacement)   // replace subset
       *
       * @memberof SparseMatrix
       * @param {Index} index
       * @param {Array | Matrix | *} [replacement]
       * @param {*} [defaultValue=0]      Default value, filled in on new entries when
       *                                  the matrix is resized. If not provided,
       *                                  new matrix elements will be filled with zeros.
       */


      SparseMatrix.prototype.subset = function (index, replacement, defaultValue) {
        // check it is a pattern matrix
        if (!this._values) {
          throw new Error('Cannot invoke subset on a Pattern only matrix');
        } // check arguments


        switch (arguments.length) {
          case 1:
            return _getsubset(this, index);
          // intentional fall through

          case 2:
          case 3:
            return _setsubset(this, index, replacement, defaultValue);

          default:
            throw new SyntaxError('Wrong number of arguments');
        }
      };

      function _getsubset(matrix, idx) {
        // check idx
        if (!isIndex(idx)) {
          throw new TypeError('Invalid index');
        }

        var isScalar = idx.isScalar();

        if (isScalar) {
          // return a scalar
          return matrix.get(idx.min());
        } // validate dimensions


        var size = idx.size();

        if (size.length !== matrix._size.length) {
          throw new DimensionError(size.length, matrix._size.length);
        } // vars


        var i, ii, k, kk; // validate if any of the ranges in the index is out of range

        var min = idx.min();
        var max = idx.max();

        for (i = 0, ii = matrix._size.length; i < ii; i++) {
          validateIndex(min[i], matrix._size[i]);
          validateIndex(max[i], matrix._size[i]);
        } // matrix arrays


        var mvalues = matrix._values;
        var mindex = matrix._index;
        var mptr = matrix._ptr; // rows & columns dimensions for result matrix

        var rows = idx.dimension(0);
        var columns = idx.dimension(1); // workspace & permutation vector

        var w = [];
        var pv = []; // loop rows in resulting matrix

        rows.forEach(function (i, r) {
          // update permutation vector
          pv[i] = r[0]; // mark i in workspace

          w[i] = true;
        }); // result matrix arrays

        var values = mvalues ? [] : undefined;
        var index = [];
        var ptr = []; // loop columns in result matrix

        columns.forEach(function (j) {
          // update ptr
          ptr.push(index.length); // loop values in column j

          for (k = mptr[j], kk = mptr[j + 1]; k < kk; k++) {
            // row
            i = mindex[k]; // check row is in result matrix

            if (w[i] === true) {
              // push index
              index.push(pv[i]); // check we need to process values

              if (values) {
                values.push(mvalues[k]);
              }
            }
          }
        }); // update ptr

        ptr.push(index.length); // return matrix

        return new SparseMatrix({
          values: values,
          index: index,
          ptr: ptr,
          size: size,
          datatype: matrix._datatype
        });
      }

      function _setsubset(matrix, index, submatrix, defaultValue) {
        // check index
        if (!index || index.isIndex !== true) {
          throw new TypeError('Invalid index');
        } // get index size and check whether the index contains a single value


        var iSize = index.size();
        var isScalar = index.isScalar(); // calculate the size of the submatrix, and convert it into an Array if needed

        var sSize;

        if (isMatrix(submatrix)) {
          // submatrix size
          sSize = submatrix.size(); // use array representation

          submatrix = submatrix.toArray();
        } else {
          // get submatrix size (array, scalar)
          sSize = arraySize(submatrix);
        } // check index is a scalar


        if (isScalar) {
          // verify submatrix is a scalar
          if (sSize.length !== 0) {
            throw new TypeError('Scalar expected');
          } // set value


          matrix.set(index.min(), submatrix, defaultValue);
        } else {
          // validate dimensions, index size must be one or two dimensions
          if (iSize.length !== 1 && iSize.length !== 2) {
            throw new DimensionError(iSize.length, matrix._size.length, '<');
          } // check submatrix and index have the same dimensions


          if (sSize.length < iSize.length) {
            // calculate number of missing outer dimensions
            var i = 0;
            var outer = 0;

            while (iSize[i] === 1 && sSize[i] === 1) {
              i++;
            }

            while (iSize[i] === 1) {
              outer++;
              i++;
            } // unsqueeze both outer and inner dimensions


            submatrix = unsqueeze(submatrix, iSize.length, outer, sSize);
          } // check whether the size of the submatrix matches the index size


          if (!deepStrictEqual(iSize, sSize)) {
            throw new DimensionError(iSize, sSize, '>');
          } // insert the sub matrix


          if (iSize.length === 1) {
            // if the replacement index only has 1 dimension, go trough each one and set its value
            var range = index.dimension(0);
            range.forEach(function (dataIndex, subIndex) {
              validateIndex(dataIndex);
              matrix.set([dataIndex, 0], submatrix[subIndex[0]], defaultValue);
            });
          } else {
            // if the replacement index has 2 dimensions, go through each one and set the value in the correct index
            var firstDimensionRange = index.dimension(0);
            var secondDimensionRange = index.dimension(1);
            firstDimensionRange.forEach(function (firstDataIndex, firstSubIndex) {
              validateIndex(firstDataIndex);
              secondDimensionRange.forEach(function (secondDataIndex, secondSubIndex) {
                validateIndex(secondDataIndex);
                matrix.set([firstDataIndex, secondDataIndex], submatrix[firstSubIndex[0]][secondSubIndex[0]], defaultValue);
              });
            });
          }
        }

        return matrix;
      }
      /**
       * Get a single element from the matrix.
       * @memberof SparseMatrix
       * @param {number[]} index   Zero-based index
       * @return {*} value
       */


      SparseMatrix.prototype.get = function (index) {
        if (!isArray(index)) {
          throw new TypeError('Array expected');
        }

        if (index.length !== this._size.length) {
          throw new DimensionError(index.length, this._size.length);
        } // check it is a pattern matrix


        if (!this._values) {
          throw new Error('Cannot invoke get on a Pattern only matrix');
        } // row and column


        var i = index[0];
        var j = index[1]; // check i, j are valid

        validateIndex(i, this._size[0]);
        validateIndex(j, this._size[1]); // find value index

        var k = _getValueIndex(i, this._ptr[j], this._ptr[j + 1], this._index); // check k is prior to next column k and it is in the correct row


        if (k < this._ptr[j + 1] && this._index[k] === i) {
          return this._values[k];
        }

        return 0;
      };
      /**
       * Replace a single element in the matrix.
       * @memberof SparseMatrix
       * @param {number[]} index   Zero-based index
       * @param {*} v
       * @param {*} [defaultValue]        Default value, filled in on new entries when
       *                                  the matrix is resized. If not provided,
       *                                  new matrix elements will be set to zero.
       * @return {SparseMatrix} self
       */


      SparseMatrix.prototype.set = function (index, v, defaultValue) {
        if (!isArray(index)) {
          throw new TypeError('Array expected');
        }

        if (index.length !== this._size.length) {
          throw new DimensionError(index.length, this._size.length);
        } // check it is a pattern matrix


        if (!this._values) {
          throw new Error('Cannot invoke set on a Pattern only matrix');
        } // row and column


        var i = index[0];
        var j = index[1]; // rows & columns

        var rows = this._size[0];
        var columns = this._size[1]; // equal signature to use

        var eq = equalScalar; // zero value

        var zero = 0;

        if (isString(this._datatype)) {
          // find signature that matches (datatype, datatype)
          eq = typed.find(equalScalar, [this._datatype, this._datatype]) || equalScalar; // convert 0 to the same datatype

          zero = typed.convert(0, this._datatype);
        } // check we need to resize matrix


        if (i > rows - 1 || j > columns - 1) {
          // resize matrix
          _resize(this, Math.max(i + 1, rows), Math.max(j + 1, columns), defaultValue); // update rows & columns


          rows = this._size[0];
          columns = this._size[1];
        } // check i, j are valid


        validateIndex(i, rows);
        validateIndex(j, columns); // find value index

        var k = _getValueIndex(i, this._ptr[j], this._ptr[j + 1], this._index); // check k is prior to next column k and it is in the correct row


        if (k < this._ptr[j + 1] && this._index[k] === i) {
          // check value != 0
          if (!eq(v, zero)) {
            // update value
            this._values[k] = v;
          } else {
            // remove value from matrix
            _remove(k, j, this._values, this._index, this._ptr);
          }
        } else {
          // insert value @ (i, j)
          _insert(k, i, j, v, this._values, this._index, this._ptr);
        }

        return this;
      };

      function _getValueIndex(i, top, bottom, index) {
        // check row is on the bottom side
        if (bottom - top === 0) {
          return bottom;
        } // loop rows [top, bottom[


        for (var r = top; r < bottom; r++) {
          // check we found value index
          if (index[r] === i) {
            return r;
          }
        } // we did not find row


        return top;
      }

      function _remove(k, j, values, index, ptr) {
        // remove value @ k
        values.splice(k, 1);
        index.splice(k, 1); // update pointers

        for (var x = j + 1; x < ptr.length; x++) {
          ptr[x]--;
        }
      }

      function _insert(k, i, j, v, values, index, ptr) {
        // insert value
        values.splice(k, 0, v); // update row for k

        index.splice(k, 0, i); // update column pointers

        for (var x = j + 1; x < ptr.length; x++) {
          ptr[x]++;
        }
      }
      /**
       * Resize the matrix to the given size. Returns a copy of the matrix when
       * `copy=true`, otherwise return the matrix itself (resize in place).
       *
       * @memberof SparseMatrix
       * @param {number[] | Matrix} size  The new size the matrix should have.
       *                                  Since sparse matrices are always two-dimensional,
       *                                  size must be two numbers in either an array or a matrix
       * @param {*} [defaultValue=0]      Default value, filled in on new entries.
       *                                  If not provided, the matrix elements will
       *                                  be filled with zeros.
       * @param {boolean} [copy]          Return a resized copy of the matrix
       *
       * @return {Matrix}                 The resized matrix
       */


      SparseMatrix.prototype.resize = function (size, defaultValue, copy) {
        // validate arguments
        if (!isCollection(size)) {
          throw new TypeError('Array or Matrix expected');
        } // SparseMatrix input is always 2d, flatten this into 1d if it's indeed a vector


        var sizeArray = size.valueOf().map(value => {
          return Array.isArray(value) && value.length === 1 ? value[0] : value;
        });

        if (sizeArray.length !== 2) {
          throw new Error('Only two dimensions matrix are supported');
        } // check sizes


        sizeArray.forEach(function (value) {
          if (!isNumber(value) || !isInteger(value) || value < 0) {
            throw new TypeError('Invalid size, must contain positive integers ' + '(size: ' + format(sizeArray) + ')');
          }
        }); // matrix to resize

        var m = copy ? this.clone() : this; // resize matrix

        return _resize(m, sizeArray[0], sizeArray[1], defaultValue);
      };

      function _resize(matrix, rows, columns, defaultValue) {
        // value to insert at the time of growing matrix
        var value = defaultValue || 0; // equal signature to use

        var eq = equalScalar; // zero value

        var zero = 0;

        if (isString(matrix._datatype)) {
          // find signature that matches (datatype, datatype)
          eq = typed.find(equalScalar, [matrix._datatype, matrix._datatype]) || equalScalar; // convert 0 to the same datatype

          zero = typed.convert(0, matrix._datatype); // convert value to the same datatype

          value = typed.convert(value, matrix._datatype);
        } // should we insert the value?


        var ins = !eq(value, zero); // old columns and rows

        var r = matrix._size[0];
        var c = matrix._size[1];
        var i, j, k; // check we need to increase columns

        if (columns > c) {
          // loop new columns
          for (j = c; j < columns; j++) {
            // update matrix._ptr for current column
            matrix._ptr[j] = matrix._values.length; // check we need to insert matrix._values

            if (ins) {
              // loop rows
              for (i = 0; i < r; i++) {
                // add new matrix._values
                matrix._values.push(value); // update matrix._index


                matrix._index.push(i);
              }
            }
          } // store number of matrix._values in matrix._ptr


          matrix._ptr[columns] = matrix._values.length;
        } else if (columns < c) {
          // truncate matrix._ptr
          matrix._ptr.splice(columns + 1, c - columns); // truncate matrix._values and matrix._index


          matrix._values.splice(matrix._ptr[columns], matrix._values.length);

          matrix._index.splice(matrix._ptr[columns], matrix._index.length);
        } // update columns


        c = columns; // check we need to increase rows

        if (rows > r) {
          // check we have to insert values
          if (ins) {
            // inserts
            var n = 0; // loop columns

            for (j = 0; j < c; j++) {
              // update matrix._ptr for current column
              matrix._ptr[j] = matrix._ptr[j] + n; // where to insert matrix._values

              k = matrix._ptr[j + 1] + n; // pointer

              var p = 0; // loop new rows, initialize pointer

              for (i = r; i < rows; i++, p++) {
                // add value
                matrix._values.splice(k + p, 0, value); // update matrix._index


                matrix._index.splice(k + p, 0, i); // increment inserts


                n++;
              }
            } // store number of matrix._values in matrix._ptr


            matrix._ptr[c] = matrix._values.length;
          }
        } else if (rows < r) {
          // deletes
          var d = 0; // loop columns

          for (j = 0; j < c; j++) {
            // update matrix._ptr for current column
            matrix._ptr[j] = matrix._ptr[j] - d; // where matrix._values start for next column

            var k0 = matrix._ptr[j];
            var k1 = matrix._ptr[j + 1] - d; // loop matrix._index

            for (k = k0; k < k1; k++) {
              // row
              i = matrix._index[k]; // check we need to delete value and matrix._index

              if (i > rows - 1) {
                // remove value
                matrix._values.splice(k, 1); // remove item from matrix._index


                matrix._index.splice(k, 1); // increase deletes


                d++;
              }
            }
          } // update matrix._ptr for current column


          matrix._ptr[j] = matrix._values.length;
        } // update matrix._size


        matrix._size[0] = rows;
        matrix._size[1] = columns; // return matrix

        return matrix;
      }
      /**
       * Reshape the matrix to the given size. Returns a copy of the matrix when
       * `copy=true`, otherwise return the matrix itself (reshape in place).
       *
       * NOTE: This might be better suited to copy by default, instead of modifying
       *       in place. For now, it operates in place to remain consistent with
       *       resize().
       *
       * @memberof SparseMatrix
       * @param {number[]} sizes          The new size the matrix should have.
       *                                  Since sparse matrices are always two-dimensional,
       *                                  size must be two numbers in either an array or a matrix
       * @param {boolean} [copy]          Return a reshaped copy of the matrix
       *
       * @return {Matrix}                 The reshaped matrix
       */


      SparseMatrix.prototype.reshape = function (sizes, copy) {
        // validate arguments
        if (!isArray(sizes)) {
          throw new TypeError('Array expected');
        }

        if (sizes.length !== 2) {
          throw new Error('Sparse matrices can only be reshaped in two dimensions');
        } // check sizes


        sizes.forEach(function (value) {
          if (!isNumber(value) || !isInteger(value) || value <= -2 || value === 0) {
            throw new TypeError('Invalid size, must contain positive integers or -1 ' + '(size: ' + format(sizes) + ')');
          }
        });
        var currentLength = this._size[0] * this._size[1];
        sizes = processSizesWildcard(sizes, currentLength);
        var newLength = sizes[0] * sizes[1]; // m * n must not change

        if (currentLength !== newLength) {
          throw new Error('Reshaping sparse matrix will result in the wrong number of elements');
        } // matrix to reshape


        var m = copy ? this.clone() : this; // return unchanged if the same shape

        if (this._size[0] === sizes[0] && this._size[1] === sizes[1]) {
          return m;
        } // Convert to COO format (generate a column index)


        var colIndex = [];

        for (var i = 0; i < m._ptr.length; i++) {
          for (var j = 0; j < m._ptr[i + 1] - m._ptr[i]; j++) {
            colIndex.push(i);
          }
        } // Clone the values array


        var values = m._values.slice(); // Clone the row index array


        var rowIndex = m._index.slice(); // Transform the (row, column) indices


        for (var _i = 0; _i < m._index.length; _i++) {
          var r1 = rowIndex[_i];
          var c1 = colIndex[_i];
          var flat = r1 * m._size[1] + c1;
          colIndex[_i] = flat % sizes[1];
          rowIndex[_i] = Math.floor(flat / sizes[1]);
        } // Now reshaping is supposed to preserve the row-major order, BUT these sparse matrices are stored
        // in column-major order, so we have to reorder the value array now. One option is to use a multisort,
        // sorting several arrays based on some other array.
        // OR, we could easily just:
        // 1. Remove all values from the matrix


        m._values.length = 0;
        m._index.length = 0;
        m._ptr.length = sizes[1] + 1;
        m._size = sizes.slice();

        for (var _i2 = 0; _i2 < m._ptr.length; _i2++) {
          m._ptr[_i2] = 0;
        } // 2. Re-insert all elements in the proper order (simplified code from SparseMatrix.prototype.set)
        // This step is probably the most time-consuming


        for (var h = 0; h < values.length; h++) {
          var _i3 = rowIndex[h];
          var _j = colIndex[h];
          var v = values[h];

          var k = _getValueIndex(_i3, m._ptr[_j], m._ptr[_j + 1], m._index);

          _insert(k, _i3, _j, v, m._values, m._index, m._ptr);
        } // The value indices are inserted out of order, but apparently that's... still OK?


        return m;
      };
      /**
       * Create a clone of the matrix
       * @memberof SparseMatrix
       * @return {SparseMatrix} clone
       */


      SparseMatrix.prototype.clone = function () {
        var m = new SparseMatrix({
          values: this._values ? clone(this._values) : undefined,
          index: clone(this._index),
          ptr: clone(this._ptr),
          size: clone(this._size),
          datatype: this._datatype
        });
        return m;
      };
      /**
       * Retrieve the size of the matrix.
       * @memberof SparseMatrix
       * @returns {number[]} size
       */


      SparseMatrix.prototype.size = function () {
        return this._size.slice(0); // copy the Array
      };
      /**
       * Create a new matrix with the results of the callback function executed on
       * each entry of the matrix.
       * @memberof SparseMatrix
       * @param {Function} callback   The callback function is invoked with three
       *                              parameters: the value of the element, the index
       *                              of the element, and the Matrix being traversed.
       * @param {boolean} [skipZeros] Invoke callback function for non-zero values only.
       *
       * @return {SparseMatrix} matrix
       */


      SparseMatrix.prototype.map = function (callback, skipZeros) {
        // check it is a pattern matrix
        if (!this._values) {
          throw new Error('Cannot invoke map on a Pattern only matrix');
        } // matrix instance


        var me = this; // rows and columns

        var rows = this._size[0];
        var columns = this._size[1]; // invoke callback

        var invoke = function invoke(v, i, j) {
          // invoke callback
          return callback(v, [i, j], me);
        }; // invoke _map


        return _map(this, 0, rows - 1, 0, columns - 1, invoke, skipZeros);
      };
      /**
       * Create a new matrix with the results of the callback function executed on the interval
       * [minRow..maxRow, minColumn..maxColumn].
       */


      function _map(matrix, minRow, maxRow, minColumn, maxColumn, callback, skipZeros) {
        // result arrays
        var values = [];
        var index = [];
        var ptr = []; // equal signature to use

        var eq = equalScalar; // zero value

        var zero = 0;

        if (isString(matrix._datatype)) {
          // find signature that matches (datatype, datatype)
          eq = typed.find(equalScalar, [matrix._datatype, matrix._datatype]) || equalScalar; // convert 0 to the same datatype

          zero = typed.convert(0, matrix._datatype);
        } // invoke callback


        var invoke = function invoke(v, x, y) {
          // invoke callback
          v = callback(v, x, y); // check value != 0

          if (!eq(v, zero)) {
            // store value
            values.push(v); // index

            index.push(x);
          }
        }; // loop columns


        for (var j = minColumn; j <= maxColumn; j++) {
          // store pointer to values index
          ptr.push(values.length); // k0 <= k < k1 where k0 = _ptr[j] && k1 = _ptr[j+1]

          var k0 = matrix._ptr[j];
          var k1 = matrix._ptr[j + 1];

          if (skipZeros) {
            // loop k within [k0, k1[
            for (var k = k0; k < k1; k++) {
              // row index
              var i = matrix._index[k]; // check i is in range

              if (i >= minRow && i <= maxRow) {
                // value @ k
                invoke(matrix._values[k], i - minRow, j - minColumn);
              }
            }
          } else {
            // create a cache holding all defined values
            var _values = {};

            for (var _k = k0; _k < k1; _k++) {
              var _i4 = matrix._index[_k];
              _values[_i4] = matrix._values[_k];
            } // loop over all rows (indexes can be unordered so we can't use that),
            // and either read the value or zero


            for (var _i5 = minRow; _i5 <= maxRow; _i5++) {
              var value = _i5 in _values ? _values[_i5] : 0;
              invoke(value, _i5 - minRow, j - minColumn);
            }
          }
        } // store number of values in ptr


        ptr.push(values.length); // return sparse matrix

        return new SparseMatrix({
          values: values,
          index: index,
          ptr: ptr,
          size: [maxRow - minRow + 1, maxColumn - minColumn + 1]
        });
      }
      /**
       * Execute a callback function on each entry of the matrix.
       * @memberof SparseMatrix
       * @param {Function} callback   The callback function is invoked with three
       *                              parameters: the value of the element, the index
       *                              of the element, and the Matrix being traversed.
       * @param {boolean} [skipZeros] Invoke callback function for non-zero values only.
       *                              If false, the indices are guaranteed to be in order,
       *                              if true, the indices can be unordered.
       */


      SparseMatrix.prototype.forEach = function (callback, skipZeros) {
        // check it is a pattern matrix
        if (!this._values) {
          throw new Error('Cannot invoke forEach on a Pattern only matrix');
        } // matrix instance


        var me = this; // rows and columns

        var rows = this._size[0];
        var columns = this._size[1]; // loop columns

        for (var j = 0; j < columns; j++) {
          // k0 <= k < k1 where k0 = _ptr[j] && k1 = _ptr[j+1]
          var k0 = this._ptr[j];
          var k1 = this._ptr[j + 1];

          if (skipZeros) {
            // loop k within [k0, k1[
            for (var k = k0; k < k1; k++) {
              // row index
              var i = this._index[k]; // value @ k

              callback(this._values[k], [i, j], me);
            }
          } else {
            // create a cache holding all defined values
            var values = {};

            for (var _k2 = k0; _k2 < k1; _k2++) {
              var _i6 = this._index[_k2];
              values[_i6] = this._values[_k2];
            } // loop over all rows (indexes can be unordered so we can't use that),
            // and either read the value or zero


            for (var _i7 = 0; _i7 < rows; _i7++) {
              var value = _i7 in values ? values[_i7] : 0;
              callback(value, [_i7, j], me);
            }
          }
        }
      };
      /**
       * Iterate over the matrix elements, skipping zeros
       * @return {Iterable<{ value, index: number[] }>}
       */


      SparseMatrix.prototype[Symbol.iterator] = function* () {
        if (!this._values) {
          throw new Error('Cannot iterate a Pattern only matrix');
        }

        var columns = this._size[1];

        for (var j = 0; j < columns; j++) {
          var k0 = this._ptr[j];
          var k1 = this._ptr[j + 1];

          for (var k = k0; k < k1; k++) {
            // row index
            var i = this._index[k];
            yield {
              value: this._values[k],
              index: [i, j]
            };
          }
        }
      };
      /**
       * Create an Array with a copy of the data of the SparseMatrix
       * @memberof SparseMatrix
       * @returns {Array} array
       */


      SparseMatrix.prototype.toArray = function () {
        return _toArray(this._values, this._index, this._ptr, this._size, true);
      };
      /**
       * Get the primitive value of the SparseMatrix: a two dimensions array
       * @memberof SparseMatrix
       * @returns {Array} array
       */


      SparseMatrix.prototype.valueOf = function () {
        return _toArray(this._values, this._index, this._ptr, this._size, false);
      };

      function _toArray(values, index, ptr, size, copy) {
        // rows and columns
        var rows = size[0];
        var columns = size[1]; // result

        var a = []; // vars

        var i, j; // initialize array

        for (i = 0; i < rows; i++) {
          a[i] = [];

          for (j = 0; j < columns; j++) {
            a[i][j] = 0;
          }
        } // loop columns


        for (j = 0; j < columns; j++) {
          // k0 <= k < k1 where k0 = _ptr[j] && k1 = _ptr[j+1]
          var k0 = ptr[j];
          var k1 = ptr[j + 1]; // loop k within [k0, k1[

          for (var k = k0; k < k1; k++) {
            // row index
            i = index[k]; // set value (use one for pattern matrix)

            a[i][j] = values ? copy ? clone(values[k]) : values[k] : 1;
          }
        }

        return a;
      }
      /**
       * Get a string representation of the matrix, with optional formatting options.
       * @memberof SparseMatrix
       * @param {Object | number | Function} [options]  Formatting options. See
       *                                                lib/utils/number:format for a
       *                                                description of the available
       *                                                options.
       * @returns {string} str
       */


      SparseMatrix.prototype.format = function (options) {
        // rows and columns
        var rows = this._size[0];
        var columns = this._size[1]; // density

        var density = this.density(); // rows & columns

        var str = 'Sparse Matrix [' + format(rows, options) + ' x ' + format(columns, options) + '] density: ' + format(density, options) + '\n'; // loop columns

        for (var j = 0; j < columns; j++) {
          // k0 <= k < k1 where k0 = _ptr[j] && k1 = _ptr[j+1]
          var k0 = this._ptr[j];
          var k1 = this._ptr[j + 1]; // loop k within [k0, k1[

          for (var k = k0; k < k1; k++) {
            // row index
            var i = this._index[k]; // append value

            str += '\n    (' + format(i, options) + ', ' + format(j, options) + ') ==> ' + (this._values ? format(this._values[k], options) : 'X');
          }
        }

        return str;
      };
      /**
       * Get a string representation of the matrix
       * @memberof SparseMatrix
       * @returns {string} str
       */


      SparseMatrix.prototype.toString = function () {
        return format(this.toArray());
      };
      /**
       * Get a JSON representation of the matrix
       * @memberof SparseMatrix
       * @returns {Object}
       */


      SparseMatrix.prototype.toJSON = function () {
        return {
          mathjs: 'SparseMatrix',
          values: this._values,
          index: this._index,
          ptr: this._ptr,
          size: this._size,
          datatype: this._datatype
        };
      };
      /**
       * Get the kth Matrix diagonal.
       *
       * @memberof SparseMatrix
       * @param {number | BigNumber} [k=0]     The kth diagonal where the vector will retrieved.
       *
       * @returns {Matrix}                     The matrix vector with the diagonal values.
       */


      SparseMatrix.prototype.diagonal = function (k) {
        // validate k if any
        if (k) {
          // convert BigNumber to a number
          if (isBigNumber(k)) {
            k = k.toNumber();
          } // is must be an integer


          if (!isNumber(k) || !isInteger(k)) {
            throw new TypeError('The parameter k must be an integer number');
          }
        } else {
          // default value
          k = 0;
        }

        var kSuper = k > 0 ? k : 0;
        var kSub = k < 0 ? -k : 0; // rows & columns

        var rows = this._size[0];
        var columns = this._size[1]; // number diagonal values

        var n = Math.min(rows - kSub, columns - kSuper); // diagonal arrays

        var values = [];
        var index = [];
        var ptr = []; // initial ptr value

        ptr[0] = 0; // loop columns

        for (var j = kSuper; j < columns && values.length < n; j++) {
          // k0 <= k < k1 where k0 = _ptr[j] && k1 = _ptr[j+1]
          var k0 = this._ptr[j];
          var k1 = this._ptr[j + 1]; // loop x within [k0, k1[

          for (var x = k0; x < k1; x++) {
            // row index
            var i = this._index[x]; // check row

            if (i === j - kSuper + kSub) {
              // value on this column
              values.push(this._values[x]); // store row

              index[values.length - 1] = i - kSub; // exit loop

              break;
            }
          }
        } // close ptr


        ptr.push(values.length); // return matrix

        return new SparseMatrix({
          values: values,
          index: index,
          ptr: ptr,
          size: [n, 1]
        });
      };
      /**
       * Generate a matrix from a JSON object
       * @memberof SparseMatrix
       * @param {Object} json  An object structured like
       *                       `{"mathjs": "SparseMatrix", "values": [], "index": [], "ptr": [], "size": []}`,
       *                       where mathjs is optional
       * @returns {SparseMatrix}
       */


      SparseMatrix.fromJSON = function (json) {
        return new SparseMatrix(json);
      };
      /**
       * Create a diagonal matrix.
       *
       * @memberof SparseMatrix
       * @param {Array} size                       The matrix size.
       * @param {number | Array | Matrix } value   The values for the diagonal.
       * @param {number | BigNumber} [k=0]         The kth diagonal where the vector will be filled in.
       * @param {number} [defaultValue]            The default value for non-diagonal
       * @param {string} [datatype]                The Matrix datatype, values must be of this datatype.
       *
       * @returns {SparseMatrix}
       */


      SparseMatrix.diagonal = function (size, value, k, defaultValue, datatype) {
        if (!isArray(size)) {
          throw new TypeError('Array expected, size parameter');
        }

        if (size.length !== 2) {
          throw new Error('Only two dimensions matrix are supported');
        } // map size & validate


        size = size.map(function (s) {
          // check it is a big number
          if (isBigNumber(s)) {
            // convert it
            s = s.toNumber();
          } // validate arguments


          if (!isNumber(s) || !isInteger(s) || s < 1) {
            throw new Error('Size values must be positive integers');
          }

          return s;
        }); // validate k if any

        if (k) {
          // convert BigNumber to a number
          if (isBigNumber(k)) {
            k = k.toNumber();
          } // is must be an integer


          if (!isNumber(k) || !isInteger(k)) {
            throw new TypeError('The parameter k must be an integer number');
          }
        } else {
          // default value
          k = 0;
        } // equal signature to use


        var eq = equalScalar; // zero value

        var zero = 0;

        if (isString(datatype)) {
          // find signature that matches (datatype, datatype)
          eq = typed.find(equalScalar, [datatype, datatype]) || equalScalar; // convert 0 to the same datatype

          zero = typed.convert(0, datatype);
        }

        var kSuper = k > 0 ? k : 0;
        var kSub = k < 0 ? -k : 0; // rows and columns

        var rows = size[0];
        var columns = size[1]; // number of non-zero items

        var n = Math.min(rows - kSub, columns - kSuper); // value extraction function

        var _value; // check value


        if (isArray(value)) {
          // validate array
          if (value.length !== n) {
            // number of values in array must be n
            throw new Error('Invalid value array length');
          } // define function


          _value = function _value(i) {
            // return value @ i
            return value[i];
          };
        } else if (isMatrix(value)) {
          // matrix size
          var ms = value.size(); // validate matrix

          if (ms.length !== 1 || ms[0] !== n) {
            // number of values in array must be n
            throw new Error('Invalid matrix length');
          } // define function


          _value = function _value(i) {
            // return value @ i
            return value.get([i]);
          };
        } else {
          // define function
          _value = function _value() {
            // return value
            return value;
          };
        } // create arrays


        var values = [];
        var index = [];
        var ptr = []; // loop items

        for (var j = 0; j < columns; j++) {
          // number of rows with value
          ptr.push(values.length); // diagonal index

          var i = j - kSuper; // check we need to set diagonal value

          if (i >= 0 && i < n) {
            // get value @ i
            var v = _value(i); // check for zero


            if (!eq(v, zero)) {
              // column
              index.push(i + kSub); // add value

              values.push(v);
            }
          }
        } // last value should be number of values


        ptr.push(values.length); // create SparseMatrix

        return new SparseMatrix({
          values: values,
          index: index,
          ptr: ptr,
          size: [rows, columns]
        });
      };
      /**
       * Swap rows i and j in Matrix.
       *
       * @memberof SparseMatrix
       * @param {number} i       Matrix row index 1
       * @param {number} j       Matrix row index 2
       *
       * @return {Matrix}        The matrix reference
       */


      SparseMatrix.prototype.swapRows = function (i, j) {
        // check index
        if (!isNumber(i) || !isInteger(i) || !isNumber(j) || !isInteger(j)) {
          throw new Error('Row index must be positive integers');
        } // check dimensions


        if (this._size.length !== 2) {
          throw new Error('Only two dimensional matrix is supported');
        } // validate index


        validateIndex(i, this._size[0]);
        validateIndex(j, this._size[0]); // swap rows

        SparseMatrix._swapRows(i, j, this._size[1], this._values, this._index, this._ptr); // return current instance


        return this;
      };
      /**
       * Loop rows with data in column j.
       *
       * @param {number} j            Column
       * @param {Array} values        Matrix values
       * @param {Array} index         Matrix row indeces
       * @param {Array} ptr           Matrix column pointers
       * @param {Function} callback   Callback function invoked for every row in column j
       */


      SparseMatrix._forEachRow = function (j, values, index, ptr, callback) {
        // indeces for column j
        var k0 = ptr[j];
        var k1 = ptr[j + 1]; // loop

        for (var k = k0; k < k1; k++) {
          // invoke callback
          callback(index[k], values[k]);
        }
      };
      /**
       * Swap rows x and y in Sparse Matrix data structures.
       *
       * @param {number} x         Matrix row index 1
       * @param {number} y         Matrix row index 2
       * @param {number} columns   Number of columns in matrix
       * @param {Array} values     Matrix values
       * @param {Array} index      Matrix row indeces
       * @param {Array} ptr        Matrix column pointers
       */


      SparseMatrix._swapRows = function (x, y, columns, values, index, ptr) {
        // loop columns
        for (var j = 0; j < columns; j++) {
          // k0 <= k < k1 where k0 = _ptr[j] && k1 = _ptr[j+1]
          var k0 = ptr[j];
          var k1 = ptr[j + 1]; // find value index @ x

          var kx = _getValueIndex(x, k0, k1, index); // find value index @ x


          var ky = _getValueIndex(y, k0, k1, index); // check both rows exist in matrix


          if (kx < k1 && ky < k1 && index[kx] === x && index[ky] === y) {
            // swap values (check for pattern matrix)
            if (values) {
              var v = values[kx];
              values[kx] = values[ky];
              values[ky] = v;
            } // next column


            continue;
          } // check x row exist & no y row


          if (kx < k1 && index[kx] === x && (ky >= k1 || index[ky] !== y)) {
            // value @ x (check for pattern matrix)
            var vx = values ? values[kx] : undefined; // insert value @ y

            index.splice(ky, 0, y);

            if (values) {
              values.splice(ky, 0, vx);
            } // remove value @ x (adjust array index if needed)


            index.splice(ky <= kx ? kx + 1 : kx, 1);

            if (values) {
              values.splice(ky <= kx ? kx + 1 : kx, 1);
            } // next column


            continue;
          } // check y row exist & no x row


          if (ky < k1 && index[ky] === y && (kx >= k1 || index[kx] !== x)) {
            // value @ y (check for pattern matrix)
            var vy = values ? values[ky] : undefined; // insert value @ x

            index.splice(kx, 0, x);

            if (values) {
              values.splice(kx, 0, vy);
            } // remove value @ y (adjust array index if needed)


            index.splice(kx <= ky ? ky + 1 : ky, 1);

            if (values) {
              values.splice(kx <= ky ? ky + 1 : ky, 1);
            }
          }
        }
      };

      return SparseMatrix;
    }, {
      isClass: true
    });

    var name$9 = 'matrix';
    var dependencies$9 = ['typed', 'Matrix', 'DenseMatrix', 'SparseMatrix'];
    var createMatrix = /* #__PURE__ */factory(name$9, dependencies$9, _ref => {
      var {
        typed,
        Matrix,
        DenseMatrix,
        SparseMatrix
      } = _ref;

      /**
       * Create a Matrix. The function creates a new `math.Matrix` object from
       * an `Array`. A Matrix has utility functions to manipulate the data in the
       * matrix, like getting the size and getting or setting values in the matrix.
       * Supported storage formats are 'dense' and 'sparse'.
       *
       * Syntax:
       *
       *    math.matrix()                         // creates an empty matrix using default storage format (dense).
       *    math.matrix(data)                     // creates a matrix with initial data using default storage format (dense).
       *    math.matrix('dense')                  // creates an empty matrix using the given storage format.
       *    math.matrix(data, 'dense')            // creates a matrix with initial data using the given storage format.
       *    math.matrix(data, 'sparse')           // creates a sparse matrix with initial data.
       *    math.matrix(data, 'sparse', 'number') // creates a sparse matrix with initial data, number data type.
       *
       * Examples:
       *
       *    let m = math.matrix([[1, 2], [3, 4]])
       *    m.size()                        // Array [2, 2]
       *    m.resize([3, 2], 5)
       *    m.valueOf()                     // Array [[1, 2], [3, 4], [5, 5]]
       *    m.get([1, 0])                    // number 3
       *
       * See also:
       *
       *    bignumber, boolean, complex, index, number, string, unit, sparse
       *
       * @param {Array | Matrix} [data]    A multi dimensional array
       * @param {string} [format]          The Matrix storage format, either `'dense'` or `'sparse'`
       * @param {string} [datatype]        Type of the values
       *
       * @return {Matrix} The created matrix
       */
      return typed(name$9, {
        '': function _() {
          return _create([]);
        },
        string: function string(format) {
          return _create([], format);
        },
        'string, string': function stringString(format, datatype) {
          return _create([], format, datatype);
        },
        Array: function Array(data) {
          return _create(data);
        },
        Matrix: function Matrix(data) {
          return _create(data, data.storage());
        },
        'Array | Matrix, string': _create,
        'Array | Matrix, string, string': _create
      });
      /**
       * Create a new Matrix with given storage format
       * @param {Array} data
       * @param {string} [format]
       * @param {string} [datatype]
       * @returns {Matrix} Returns a new Matrix
       * @private
       */

      function _create(data, format, datatype) {
        // get storage format constructor
        if (format === 'dense' || format === 'default' || format === undefined) {
          return new DenseMatrix(data, datatype);
        }

        if (format === 'sparse') {
          return new SparseMatrix(data, datatype);
        }

        throw new TypeError('Unknown matrix type ' + JSON.stringify(format) + '.');
      }
    });

    var name$8 = 'algorithm11';
    var dependencies$8 = ['typed', 'equalScalar'];
    var createAlgorithm11 = /* #__PURE__ */factory(name$8, dependencies$8, _ref => {
      var {
        typed,
        equalScalar
      } = _ref;

      /**
       * Iterates over SparseMatrix S nonzero items and invokes the callback function f(Sij, b).
       * Callback function invoked NZ times (number of nonzero items in S).
       *
       *
       *          ┌  f(Sij, b)  ; S(i,j) !== 0
       * C(i,j) = ┤
       *          └  0          ; otherwise
       *
       *
       * @param {Matrix}   s                 The SparseMatrix instance (S)
       * @param {Scalar}   b                 The Scalar value
       * @param {Function} callback          The f(Aij,b) operation to invoke
       * @param {boolean}  inverse           A true value indicates callback should be invoked f(b,Sij)
       *
       * @return {Matrix}                    SparseMatrix (C)
       *
       * https://github.com/josdejong/mathjs/pull/346#issuecomment-97626813
       */
      return function algorithm11(s, b, callback, inverse) {
        // sparse matrix arrays
        var avalues = s._values;
        var aindex = s._index;
        var aptr = s._ptr;
        var asize = s._size;
        var adt = s._datatype; // sparse matrix cannot be a Pattern matrix

        if (!avalues) {
          throw new Error('Cannot perform operation on Pattern Sparse Matrix and Scalar value');
        } // rows & columns


        var rows = asize[0];
        var columns = asize[1]; // datatype

        var dt; // equal signature to use

        var eq = equalScalar; // zero value

        var zero = 0; // callback signature to use

        var cf = callback; // process data types

        if (typeof adt === 'string') {
          // datatype
          dt = adt; // find signature that matches (dt, dt)

          eq = typed.find(equalScalar, [dt, dt]); // convert 0 to the same datatype

          zero = typed.convert(0, dt); // convert b to the same datatype

          b = typed.convert(b, dt); // callback

          cf = typed.find(callback, [dt, dt]);
        } // result arrays


        var cvalues = [];
        var cindex = [];
        var cptr = []; // loop columns

        for (var j = 0; j < columns; j++) {
          // initialize ptr
          cptr[j] = cindex.length; // values in j

          for (var k0 = aptr[j], k1 = aptr[j + 1], k = k0; k < k1; k++) {
            // row
            var i = aindex[k]; // invoke callback

            var v = inverse ? cf(b, avalues[k]) : cf(avalues[k], b); // check value is zero

            if (!eq(v, zero)) {
              // push index & value
              cindex.push(i);
              cvalues.push(v);
            }
          }
        } // update ptr


        cptr[columns] = cindex.length; // return sparse matrix

        return s.createSparseMatrix({
          values: cvalues,
          index: cindex,
          ptr: cptr,
          size: [rows, columns],
          datatype: dt
        });
      };
    });

    var name$7 = 'algorithm14';
    var dependencies$7 = ['typed'];
    var createAlgorithm14 = /* #__PURE__ */factory(name$7, dependencies$7, _ref => {
      var {
        typed
      } = _ref;

      /**
       * Iterates over DenseMatrix items and invokes the callback function f(Aij..z, b).
       * Callback function invoked MxN times.
       *
       * C(i,j,...z) = f(Aij..z, b)
       *
       * @param {Matrix}   a                 The DenseMatrix instance (A)
       * @param {Scalar}   b                 The Scalar value
       * @param {Function} callback          The f(Aij..z,b) operation to invoke
       * @param {boolean}  inverse           A true value indicates callback should be invoked f(b,Aij..z)
       *
       * @return {Matrix}                    DenseMatrix (C)
       *
       * https://github.com/josdejong/mathjs/pull/346#issuecomment-97659042
       */
      return function algorithm14(a, b, callback, inverse) {
        // a arrays
        var adata = a._data;
        var asize = a._size;
        var adt = a._datatype; // datatype

        var dt; // callback signature to use

        var cf = callback; // process data types

        if (typeof adt === 'string') {
          // datatype
          dt = adt; // convert b to the same datatype

          b = typed.convert(b, dt); // callback

          cf = typed.find(callback, [dt, dt]);
        } // populate cdata, iterate through dimensions


        var cdata = asize.length > 0 ? _iterate(cf, 0, asize, asize[0], adata, b, inverse) : []; // c matrix

        return a.createDenseMatrix({
          data: cdata,
          size: clone(asize),
          datatype: dt
        });
      }; // recursive function

      function _iterate(f, level, s, n, av, bv, inverse) {
        // initialize array for this level
        var cv = []; // check we reach the last level

        if (level === s.length - 1) {
          // loop arrays in last level
          for (var i = 0; i < n; i++) {
            // invoke callback and store value
            cv[i] = inverse ? f(bv, av[i]) : f(av[i], bv);
          }
        } else {
          // iterate current level
          for (var j = 0; j < n; j++) {
            // iterate next level
            cv[j] = _iterate(f, level + 1, s, s[level + 1], av[j], bv, inverse);
          }
        }

        return cv;
      }
    });

    var name$6 = 'algorithm12';
    var dependencies$6 = ['typed', 'DenseMatrix'];
    var createAlgorithm12 = /* #__PURE__ */factory(name$6, dependencies$6, _ref => {
      var {
        typed,
        DenseMatrix
      } = _ref;

      /**
       * Iterates over SparseMatrix S nonzero items and invokes the callback function f(Sij, b).
       * Callback function invoked MxN times.
       *
       *
       *          ┌  f(Sij, b)  ; S(i,j) !== 0
       * C(i,j) = ┤
       *          └  f(0, b)    ; otherwise
       *
       *
       * @param {Matrix}   s                 The SparseMatrix instance (S)
       * @param {Scalar}   b                 The Scalar value
       * @param {Function} callback          The f(Aij,b) operation to invoke
       * @param {boolean}  inverse           A true value indicates callback should be invoked f(b,Sij)
       *
       * @return {Matrix}                    DenseMatrix (C)
       *
       * https://github.com/josdejong/mathjs/pull/346#issuecomment-97626813
       */
      return function algorithm12(s, b, callback, inverse) {
        // sparse matrix arrays
        var avalues = s._values;
        var aindex = s._index;
        var aptr = s._ptr;
        var asize = s._size;
        var adt = s._datatype; // sparse matrix cannot be a Pattern matrix

        if (!avalues) {
          throw new Error('Cannot perform operation on Pattern Sparse Matrix and Scalar value');
        } // rows & columns


        var rows = asize[0];
        var columns = asize[1]; // datatype

        var dt; // callback signature to use

        var cf = callback; // process data types

        if (typeof adt === 'string') {
          // datatype
          dt = adt; // convert b to the same datatype

          b = typed.convert(b, dt); // callback

          cf = typed.find(callback, [dt, dt]);
        } // result arrays


        var cdata = []; // workspaces

        var x = []; // marks indicating we have a value in x for a given column

        var w = []; // loop columns

        for (var j = 0; j < columns; j++) {
          // columns mark
          var mark = j + 1; // values in j

          for (var k0 = aptr[j], k1 = aptr[j + 1], k = k0; k < k1; k++) {
            // row
            var r = aindex[k]; // update workspace

            x[r] = avalues[k];
            w[r] = mark;
          } // loop rows


          for (var i = 0; i < rows; i++) {
            // initialize C on first column
            if (j === 0) {
              // create row array
              cdata[i] = [];
            } // check sparse matrix has a value @ i,j


            if (w[i] === mark) {
              // invoke callback, update C
              cdata[i][j] = inverse ? cf(b, x[i]) : cf(x[i], b);
            } else {
              // dense matrix value @ i, j
              cdata[i][j] = inverse ? cf(b, 0) : cf(0, b);
            }
          }
        } // return dense matrix


        return new DenseMatrix({
          data: cdata,
          size: [rows, columns],
          datatype: dt
        });
      };
    });

    var name$5 = 'sqrt';
    var dependencies$5 = ['config', 'typed', 'Complex'];
    var createSqrt = /* #__PURE__ */factory(name$5, dependencies$5, _ref => {
      var {
        config,
        typed,
        Complex
      } = _ref;

      /**
       * Calculate the square root of a value.
       *
       * For matrices, the function is evaluated element wise.
       *
       * Syntax:
       *
       *    math.sqrt(x)
       *
       * Examples:
       *
       *    math.sqrt(25)                // returns 5
       *    math.square(5)               // returns 25
       *    math.sqrt(-4)                // returns Complex 2i
       *
       * See also:
       *
       *    square, multiply, cube, cbrt, sqrtm
       *
       * @param {number | BigNumber | Complex | Array | Matrix | Unit} x
       *            Value for which to calculate the square root.
       * @return {number | BigNumber | Complex | Array | Matrix | Unit}
       *            Returns the square root of `x`
       */
      return typed('sqrt', {
        number: _sqrtNumber,
        Complex: function Complex(x) {
          return x.sqrt();
        },
        BigNumber: function BigNumber(x) {
          if (!x.isNegative() || config.predictable) {
            return x.sqrt();
          } else {
            // negative value -> downgrade to number to do complex value computation
            return _sqrtNumber(x.toNumber());
          }
        },
        'Array | Matrix': function ArrayMatrix(x) {
          // deep map collection, skip zeros since sqrt(0) = 0
          return deepMap(x, this);
        },
        Unit: function Unit(x) {
          // Someday will work for complex units when they are implemented
          return x.pow(0.5);
        }
      });
      /**
       * Calculate sqrt for a number
       * @param {number} x
       * @returns {number | Complex} Returns the square root of x
       * @private
       */

      function _sqrtNumber(x) {
        if (isNaN(x)) {
          return NaN;
        } else if (x >= 0 || config.predictable) {
          return Math.sqrt(x);
        } else {
          return new Complex(x, 0).sqrt();
        }
      }
    });

    var name$4 = 'zeros';
    var dependencies$4 = ['typed', 'config', 'matrix', 'BigNumber'];
    var createZeros = /* #__PURE__ */factory(name$4, dependencies$4, _ref => {
      var {
        typed,
        config,
        matrix,
        BigNumber
      } = _ref;

      /**
       * Create a matrix filled with zeros. The created matrix can have one or
       * multiple dimensions.
       *
       * Syntax:
       *
       *    math.zeros(m)
       *    math.zeros(m, format)
       *    math.zeros(m, n)
       *    math.zeros(m, n, format)
       *    math.zeros([m, n])
       *    math.zeros([m, n], format)
       *
       * Examples:
       *
       *    math.zeros(3)                  // returns [0, 0, 0]
       *    math.zeros(3, 2)               // returns [[0, 0], [0, 0], [0, 0]]
       *    math.zeros(3, 'dense')         // returns [0, 0, 0]
       *
       *    const A = [[1, 2, 3], [4, 5, 6]]
       *    math.zeros(math.size(A))       // returns [[0, 0, 0], [0, 0, 0]]
       *
       * See also:
       *
       *    ones, identity, size, range
       *
       * @param {...number | Array} size    The size of each dimension of the matrix
       * @param {string} [format]           The Matrix storage format
       *
       * @return {Array | Matrix}           A matrix filled with zeros
       */
      return typed(name$4, {
        '': function _() {
          return config.matrix === 'Array' ? _zeros([]) : _zeros([], 'default');
        },
        // math.zeros(m, n, p, ..., format)
        // TODO: more accurate signature '...number | BigNumber, string' as soon as typed-function supports this
        '...number | BigNumber | string': function numberBigNumberString(size) {
          var last = size[size.length - 1];

          if (typeof last === 'string') {
            var format = size.pop();
            return _zeros(size, format);
          } else if (config.matrix === 'Array') {
            return _zeros(size);
          } else {
            return _zeros(size, 'default');
          }
        },
        Array: _zeros,
        Matrix: function Matrix(size) {
          var format = size.storage();
          return _zeros(size.valueOf(), format);
        },
        'Array | Matrix, string': function ArrayMatrixString(size, format) {
          return _zeros(size.valueOf(), format);
        }
      });
      /**
       * Create an Array or Matrix with zeros
       * @param {Array} size
       * @param {string} [format='default']
       * @return {Array | Matrix}
       * @private
       */

      function _zeros(size, format) {
        var hasBigNumbers = _normalize(size);

        var defaultValue = hasBigNumbers ? new BigNumber(0) : 0;

        _validate(size);

        if (format) {
          // return a matrix
          var m = matrix(format);

          if (size.length > 0) {
            return m.resize(size, defaultValue);
          }

          return m;
        } else {
          // return an Array
          var arr = [];

          if (size.length > 0) {
            return resize(arr, size, defaultValue);
          }

          return arr;
        }
      } // replace BigNumbers with numbers, returns true if size contained BigNumbers


      function _normalize(size) {
        var hasBigNumbers = false;
        size.forEach(function (value, index, arr) {
          if (isBigNumber(value)) {
            hasBigNumbers = true;
            arr[index] = value.toNumber();
          }
        });
        return hasBigNumbers;
      } // validate arguments


      function _validate(size) {
        size.forEach(function (value) {
          if (typeof value !== 'number' || !isInteger(value) || value < 0) {
            throw new Error('Parameters in function zeros must be positive integers');
          }
        });
      }
    }); // TODO: zeros contains almost the same code as ones. Reuse this?

    function _defineProperty(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }

      return obj;
    }

    function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
    var NO_INT = 'Number of decimals in function round must be an integer';
    var name$3 = 'round';
    var dependencies$3 = ['typed', 'matrix', 'equalScalar', 'zeros', 'BigNumber', 'DenseMatrix'];
    var createRound = /* #__PURE__ */factory(name$3, dependencies$3, _ref => {
      var {
        typed,
        matrix,
        equalScalar,
        zeros,
        BigNumber,
        DenseMatrix
      } = _ref;
      var algorithm11 = createAlgorithm11({
        typed,
        equalScalar
      });
      var algorithm12 = createAlgorithm12({
        typed,
        DenseMatrix
      });
      var algorithm14 = createAlgorithm14({
        typed
      });
      /**
       * Round a value towards the nearest integer.
       * For matrices, the function is evaluated element wise.
       *
       * Syntax:
       *
       *    math.round(x)
       *    math.round(x, n)
       *
       * Examples:
       *
       *    math.round(3.22)             // returns number 3
       *    math.round(3.82)             // returns number 4
       *    math.round(-4.2)             // returns number -4
       *    math.round(-4.7)             // returns number -5
       *    math.round(3.22, 1)          // returns number 3.2
       *    math.round(3.88, 1)          // returns number 3.9
       *    math.round(-4.21, 1)         // returns number -4.2
       *    math.round(-4.71, 1)         // returns number -4.7
       *    math.round(math.pi, 3)       // returns number 3.142
       *    math.round(123.45678, 2)     // returns number 123.46
       *
       *    const c = math.complex(3.2, -2.7)
       *    math.round(c)                // returns Complex 3 - 3i
       *
       *    math.round([3.2, 3.8, -4.7]) // returns Array [3, 4, -5]
       *
       * See also:
       *
       *    ceil, fix, floor
       *
       * @param  {number | BigNumber | Fraction | Complex | Array | Matrix} x  Number to be rounded
       * @param  {number | BigNumber | Array} [n=0]                            Number of decimals
       * @return {number | BigNumber | Fraction | Complex | Array | Matrix} Rounded value
       */

      return typed(name$3, _objectSpread(_objectSpread({}, roundNumberSignatures), {}, {
        Complex: function Complex(x) {
          return x.round();
        },
        'Complex, number': function ComplexNumber(x, n) {
          if (n % 1) {
            throw new TypeError(NO_INT);
          }

          return x.round(n);
        },
        'Complex, BigNumber': function ComplexBigNumber(x, n) {
          if (!n.isInteger()) {
            throw new TypeError(NO_INT);
          }

          var _n = n.toNumber();

          return x.round(_n);
        },
        'number, BigNumber': function numberBigNumber(x, n) {
          if (!n.isInteger()) {
            throw new TypeError(NO_INT);
          }

          return new BigNumber(x).toDecimalPlaces(n.toNumber());
        },
        BigNumber: function BigNumber(x) {
          return x.toDecimalPlaces(0);
        },
        'BigNumber, BigNumber': function BigNumberBigNumber(x, n) {
          if (!n.isInteger()) {
            throw new TypeError(NO_INT);
          }

          return x.toDecimalPlaces(n.toNumber());
        },
        Fraction: function Fraction(x) {
          return x.round();
        },
        'Fraction, number': function FractionNumber(x, n) {
          if (n % 1) {
            throw new TypeError(NO_INT);
          }

          return x.round(n);
        },
        'Array | Matrix': function ArrayMatrix(x) {
          // deep map collection, skip zeros since round(0) = 0
          return deepMap(x, this);
        },
        'SparseMatrix, number | BigNumber': function SparseMatrixNumberBigNumber(x, y) {
          return algorithm11(x, y, this, false);
        },
        'DenseMatrix, number | BigNumber': function DenseMatrixNumberBigNumber(x, y) {
          return algorithm14(x, y, this, false);
        },
        'number | Complex | BigNumber, SparseMatrix': function numberComplexBigNumberSparseMatrix(x, y) {
          // check scalar is zero
          if (equalScalar(x, 0)) {
            // do not execute algorithm, result will be a zero matrix
            return zeros(y.size(), y.storage());
          }

          return algorithm12(y, x, this, true);
        },
        'number | Complex | BigNumber, DenseMatrix': function numberComplexBigNumberDenseMatrix(x, y) {
          // check scalar is zero
          if (equalScalar(x, 0)) {
            // do not execute algorithm, result will be a zero matrix
            return zeros(y.size(), y.storage());
          }

          return algorithm14(y, x, this, true);
        },
        'Array, number | BigNumber': function ArrayNumberBigNumber(x, y) {
          // use matrix implementation
          return algorithm14(matrix(x), y, this, false).valueOf();
        },
        'number | Complex | BigNumber, Array': function numberComplexBigNumberArray(x, y) {
          // use matrix implementation
          return algorithm14(matrix(y), x, this, true).valueOf();
        }
      }));
    });
    var roundNumberSignatures = {
      number: roundNumber,
      'number, number': function numberNumber(x, n) {
        if (!isInteger(n)) {
          throw new TypeError(NO_INT);
        }

        if (n < 0 || n > 15) {
          throw new Error('Number of decimals in function round must be in the range of 0-15');
        }

        return roundNumber(x, n);
      }
    };

    var name$2 = 'acos';
    var dependencies$2 = ['typed', 'config', 'Complex'];
    var createAcos = /* #__PURE__ */factory(name$2, dependencies$2, _ref => {
      var {
        typed,
        config,
        Complex
      } = _ref;

      /**
       * Calculate the inverse cosine of a value.
       *
       * For matrices, the function is evaluated element wise.
       *
       * Syntax:
       *
       *    math.acos(x)
       *
       * Examples:
       *
       *    math.acos(0.5)           // returns number 1.0471975511965979
       *    math.acos(math.cos(1.5)) // returns number 1.5
       *
       *    math.acos(2)             // returns Complex 0 + 1.3169578969248166 i
       *
       * See also:
       *
       *    cos, atan, asin
       *
       * @param {number | BigNumber | Complex | Array | Matrix} x  Function input
       * @return {number | BigNumber | Complex | Array | Matrix} The arc cosine of x
       */
      return typed(name$2, {
        number: function number(x) {
          if (x >= -1 && x <= 1 || config.predictable) {
            return Math.acos(x);
          } else {
            return new Complex(x, 0).acos();
          }
        },
        Complex: function Complex(x) {
          return x.acos();
        },
        BigNumber: function BigNumber(x) {
          return x.acos();
        },
        'Array | Matrix': function ArrayMatrix(x) {
          return deepMap(x, this);
        }
      });
    });

    var name$1 = 'sin';
    var dependencies$1 = ['typed'];
    var createSin = /* #__PURE__ */factory(name$1, dependencies$1, _ref => {
      var {
        typed
      } = _ref;

      /**
       * Calculate the sine of a value.
       *
       * For matrices, the function is evaluated element wise.
       *
       * Syntax:
       *
       *    math.sin(x)
       *
       * Examples:
       *
       *    math.sin(2)                      // returns number 0.9092974268256813
       *    math.sin(math.pi / 4)            // returns number 0.7071067811865475
       *    math.sin(math.unit(90, 'deg'))   // returns number 1
       *    math.sin(math.unit(30, 'deg'))   // returns number 0.5
       *
       *    const angle = 0.2
       *    math.pow(math.sin(angle), 2) + math.pow(math.cos(angle), 2) // returns number ~1
       *
       * See also:
       *
       *    cos, tan
       *
       * @param {number | BigNumber | Complex | Unit | Array | Matrix} x  Function input
       * @return {number | BigNumber | Complex | Array | Matrix} Sine of x
       */
      return typed(name$1, {
        number: Math.sin,
        Complex: function Complex(x) {
          return x.sin();
        },
        BigNumber: function BigNumber(x) {
          return x.sin();
        },
        Unit: function Unit(x) {
          if (!x.hasBase(x.constructor.BASE_UNITS.ANGLE)) {
            throw new TypeError('Unit in function sin is no angle');
          }

          return this(x.value);
        },
        'Array | Matrix': function ArrayMatrix(x) {
          // deep map collection, skip zeros since sin(0) = 0
          return deepMap(x, this);
        }
      });
    });

    var name = 'tan';
    var dependencies = ['typed'];
    var createTan = /* #__PURE__ */factory(name, dependencies, _ref => {
      var {
        typed
      } = _ref;

      /**
       * Calculate the tangent of a value. `tan(x)` is equal to `sin(x) / cos(x)`.
       *
       * For matrices, the function is evaluated element wise.
       *
       * Syntax:
       *
       *    math.tan(x)
       *
       * Examples:
       *
       *    math.tan(0.5)                    // returns number 0.5463024898437905
       *    math.sin(0.5) / math.cos(0.5)    // returns number 0.5463024898437905
       *    math.tan(math.pi / 4)            // returns number 1
       *    math.tan(math.unit(45, 'deg'))   // returns number 1
       *
       * See also:
       *
       *    atan, sin, cos
       *
       * @param {number | BigNumber | Complex | Unit | Array | Matrix} x  Function input
       * @return {number | BigNumber | Complex | Array | Matrix} Tangent of x
       */
      return typed(name, {
        number: Math.tan,
        Complex: function Complex(x) {
          return x.tan();
        },
        BigNumber: function BigNumber(x) {
          return x.tan();
        },
        Unit: function Unit(x) {
          if (!x.hasBase(x.constructor.BASE_UNITS.ANGLE)) {
            throw new TypeError('Unit in function tan is no angle');
          }

          return this(x.value);
        },
        'Array | Matrix': function ArrayMatrix(x) {
          // deep map collection, skip zeros since tan(0) = 0
          return deepMap(x, this);
        }
      });
    });

    /**
     * THIS FILE IS AUTO-GENERATED
     * DON'T MAKE CHANGES HERE
     */
    var BigNumber = /* #__PURE__ */createBigNumberClass({
      config
    });
    var Complex = /* #__PURE__ */createComplexClass({});
    var Fraction = /* #__PURE__ */createFractionClass({});
    var Matrix = /* #__PURE__ */createMatrixClass({});
    var DenseMatrix = /* #__PURE__ */createDenseMatrixClass({
      Matrix
    });
    var typed = /* #__PURE__ */createTyped({
      BigNumber,
      Complex,
      DenseMatrix,
      Fraction
    });
    var acos = /* #__PURE__ */createAcos({
      Complex,
      config,
      typed
    });
    var equalScalar = /* #__PURE__ */createEqualScalar({
      config,
      typed
    });
    var sin = /* #__PURE__ */createSin({
      typed
    });
    var SparseMatrix = /* #__PURE__ */createSparseMatrixClass({
      Matrix,
      equalScalar,
      typed
    });
    var tan = /* #__PURE__ */createTan({
      typed
    });
    var sqrt = /* #__PURE__ */createSqrt({
      Complex,
      config,
      typed
    });
    var matrix = /* #__PURE__ */createMatrix({
      DenseMatrix,
      Matrix,
      SparseMatrix,
      typed
    });
    var zeros = /* #__PURE__ */createZeros({
      BigNumber,
      config,
      matrix,
      typed
    });
    var round = /* #__PURE__ */createRound({
      BigNumber,
      DenseMatrix,
      equalScalar,
      matrix,
      typed,
      zeros
    });

    class Vector3D {
        constructor(xin, yin, zin) {
            this.x = xin;
            this.y = yin;
            this.z = zin;
        }
        static dotProduct(a, b) {
            return a.x * b.x + a.y * b.y + a.z * b.z;
        }
        get lengthSquared() {
            return this.x ** 2 + this.y ** 2 + this.z ** 2;
        }
        get length() {
            return Math.sqrt(this.lengthSquared);
        }
        get magnitude() {
            return this.length;
        }
        get isAlmostZero() {
            return this.length < 0.05;
        }
        normalize() {
            const mag = this.magnitude;
            this.x /= mag;
            this.y /= mag;
            this.z /= mag;
        }
        toString(decimals = 4) {
            return `{X= ${this.x.toFixed(decimals)},   Y= ${this.y.toFixed(decimals)},   Z= ${this.z.toFixed(decimals)}}`;
        }
        toString2(decimals = 4) {
            return `${this.x.toFixed(decimals)}, ${this.y.toFixed(decimals)}, ${this.z.toFixed(decimals)}`;
        }
        static add(a, b) {
            return new Vector3D(a.x + b.x, a.y + b.y, a.z + b.z);
        }
        add(b) {
            return Vector3D.add(this, b);
        }
        static sub(a, b) {
            return new Vector3D(a.x + b.x, a.y + b.y, a.z + b.z);
        }
        sub(b) {
            return Vector3D.sub(this, b);
        }
        static multiply(a, b) {
            if (typeof b === 'number') {
                return new Vector3D(a.x * b, a.y * b, a.z * b);
            }
            else {
                return new Vector3D(a.x * b.x, a.y * b.y, a.z * b.z);
            }
        }
        multiply(b) {
            return Vector3D.multiply(this, b);
        }
        static divide(a, b) {
            if (typeof b === 'number') {
                return new Vector3D(a.x / b, a.y / b, a.z / b);
            }
            else {
                return new Vector3D(a.x / b.x, a.y / b.y, a.z / b.z);
            }
        }
        divide(b) {
            return Vector3D.divide(this, b);
        }
    }

    function calcSag3D(x, y, surf, rTolforZero = 0.001) {
        let c = 0;
        if (Math.abs(surf.r) > rTolforZero) {
            c = 1 / surf.r;
        }
        const r2 = x ** 2 + y ** 2;
        const sqrtvalue = 1 - (1 + surf.k) * c ** 2 * r2;
        if (sqrtvalue < 0) {
            return 0;
        }
        else {
            return (c * r2) / (1 + Math.sqrt(sqrtvalue)) + surf.ad * r2 ** 2 + surf.ae * r2 ** 3;
        }
    }
    function calcSlope3D(P, s) {
        const p = P.x ** 2 + P.y ** 2;
        const q0 = P.z - s.ad * p ** 2 - s.ae * p ** 3;
        const q1 = -4 * s.ad * p - 6 * s.ae * p ** 2;
        const dx = P.x * (-s.c - s.c * (s.k + 1) * q1 * q0 + q1);
        const dy = P.y * (-s.c - s.c * (s.k + 1) * q1 * q0 + q1);
        const dz = 1 - s.c * (s.k + 1) * q0;
        const N = new Vector3D(dx, dy, dz);
        const n = N.divide(N.length);
        const F = -(s.c / 2) * p - (s.c / 2) * (s.k + 1) * q0 ** 2 + q0;
        return [n, F];
    }
    function calcDirSines(E, N, nin, nout) {
        const alpha = Vector3D.dotProduct(E, N);
        //var aoi = Math.Acos(alpha).RadToDeg();
        //var aor = Math.Asin(Math.Sin(Math.Acos(alpha)) * nin / nout).RadToDeg();
        const a = 1.0;
        const b = 2 * alpha;
        const c = 1 - nout ** 2 / nin ** 2;
        const sol2 = (-b + Math.sqrt(b ** 2 - 4 * a * c)) / (2 * a);
        let Ep = E.add(N.multiply(sol2));
        Ep = Ep.divide(Ep.length);
        return Ep;
        //return (Ep, aoi, aor);
    }
    function translateToFlatSurf(P, E, zplane) {
        var u = (zplane - P.z) / E.z;
        return P.add(E.multiply(u));
    }
    function traceToSurf(D, E, surf, plane = 0) {
        if (surf.type === 'plane') {
            return translateToFlatSurf(D, E, plane);
        }
        let zest1 = calcSag3D(D.x, D.y, surf) + plane;
        let u = (zest1 - D.z) / E.z;
        let P1 = D;
        let P2 = D.add(E.multiply(u));
        for (let i = 0; i < 10; i++) {
            if (P1.sub(P2).length > 1e-4) {
                P1 = P2;
                zest1 = calcSag3D(P1.x, P1.y, surf) + plane;
                u = (zest1 - D.z) / E.z;
                P2 = D.add(E.multiply(u));
            }
            else {
                break;
            }
        }
        return P2;
    }
    function trace3DRay(P0, E0, lens, Refocus) {
        // D or P are position vectors
        // C center points of surfaces
        // E are ray direction cosine vectors
        // N are surface normals
        // Z is the zero vector used as place holder in data table
        //var P2 = TraceRayToSide1_A(P0, E0, lens);
        const P2 = traceToSurf(P0, E0, lens.surf1, 0.0);
        const [N2, F] = calcSlope3D(P2, lens.surf1);
        //var (E2, aoi2, aor2) = CalcDirSines(E0, N2, 1.0, lens_in.n);  // after refraction
        const E2 = calcDirSines(E0, N2, 1.0, lens.nIndex); // after refraction
        // Trace to Surface 2 after refraction
        const P3 = traceToSurf(P2, E2, lens.surf2, lens.ct);
        const [N3, _] = calcSlope3D(new Vector3D(P3.x, P3.y, P3.z - lens.ct), lens.surf2); // adjust z for CT of lens
        //var (E3, aoi3, aor3) = CalcDirSines(E2, N3, lens_in.n, 1);
        const E3 = calcDirSines(E2, N3, lens.nIndex, 1);
        // transfer ray to image plane
        const P4 = translateToFlatSurf(P3, E3, lens.ct + lens.BFL + Refocus);
        //var E5 = E3;
        //var N5 = new Vector3D(0, 0, 1);
        //var aoi5 = Math.Acos(Vector3D.DotProduct(E3, N5)).RadToDeg();
        return { pVector: P4, eDir: E3 };
    }
    // function gen2DZeroArray(size: number): number[][] {
    //   return new Array(size).fill(new Array(size).fill(0))
    // }
    // export function processVlistData(
    //   Vlist: Vector3D[],
    //   lens: Lens,
    //   Refocus: number,
    //   fiber_radius: number
    // ) {
    //   const maxbin = 2 * fiber_radius
    //   const minbin = -maxbin
    //   const steps = 201
    //   const binsize = (maxbin - minbin) / steps
    //   const indata = gen2DZeroArray(steps)
    //   let errors = 0
    //   Vlist.forEach((p) => {
    //     const row = Math.round((p.x - minbin) / binsize)
    //     const col = Math.round((p.y - minbin) / binsize)
    //     if (row >= 0 && row < steps && col >= 0 && col < steps) {
    //       indata[row][col] += 1
    //     } else {
    //       errors++
    //     }
    //   })
    //   return indata
    // }
    // export function sliceDataMidPt(data: number[][], border = 0) {
    //   const rows = data.length
    //   const cols = data[0].length
    //   const midrow = Math.round(rows / 2)
    //   const odata: number[] = new Array(cols).fill(0)
    //   for (let c = 0; c < cols; c++) {
    //     let sum = 0
    //     for (let r = midrow - border; r <= midrow + border; r++) {
    //       sum += data[r][c]
    //     }
    //     odata[c] = sum / (1 + 2 * border)
    //   }
    //   return odata
    // }
    // export interface WFERay {
    //   yIn: number
    //   yEnd: number
    //   zEnd: number
    //   AOI: number
    //   slope: number
    //   LSA: number
    //   OPD: number
    // }
    // export class PointD {
    //   x: number
    //   y: number
    //   constructor(x: number = 0, y: number = 0) {
    //     this.x = x
    //     this.y = y
    //   }
    //   isAlmostZero(): boolean {
    //     return Math.sqrt(this.x * this.x + this.y * this.y) < 0.05
    //   }
    // }
    // export class RayVector {
    //   pBegin: PointD
    //   pEnd: PointD
    //   AOI: number
    //   AOR: number
    //   index: number
    //   constructor(
    //     x0: number,
    //     y0: number,
    //     x1: number,
    //     y1: number,
    //     index: number,
    //     aoi: number,
    //     aor: number
    //   ) {
    //     this.pBegin = new PointD(x0, y0)
    //     this.pEnd = new PointD(x1, y1)
    //     this.index = index
    //     this.AOI = aoi
    //     this.AOR = aor
    //   }
    //   get OPD(): number {
    //     const l = Math.sqrt(
    //       (this.pEnd.x - this.pBegin.x) * (this.pEnd.x - this.pBegin.x) +
    //         (this.pEnd.y - this.pBegin.y) * (this.pEnd.y - this.pBegin.y)
    //     )
    //     return l * this.index
    //   }
    // }

    const zeroDir$1 = new Vector3D(0.0, 0.0, 1.0);
    // *************************************************************************
    // all functions below would normally not be exported, but they now are so  
    // that the test1.ts main program can debug or vet their results.
    // *************************************************************************
    function calcWfeVecs(p0, e0, lens, refocus) {
        let p1 = new Vector3D(p0.x / sqrt(2.0), p0.y / sqrt(2.0), 0.0);
        let rsq = p0.x * p0.x + p0.y * p0.y;
        let rsqsq = rsq * rsq;
        if (rsq < 1.0e-8) {
            return 0.0;
        }
        let lstatm = CalcLSAVecs(p0, e0, lens, 0.0);
        let lstatz = CalcLSAVecs(p1, e0, lens, 0.0);
        let a = (4.0 * lstatz.lsa - lstatm.lsa) / rsq;
        let b = (2.0 * lstatm.lsa - 4.0 * lstatz.lsa) / rsqsq;
        /*
        console.log("")
        console.log("p0: " + p0.toString2(3))
        console.log("e0: " + e0.toString2(3));
        console.log("p1: " + p1.toString2(3))
        console.log("rm.v: " + lstatm.rayout.pVector.toString2(6))
        console.log("rz.v: " + lstatz.rayout.pVector.toString2(6))
        console.log("lstatm: " + LsaResToStr(lstatm, 6))
        console.log("lstatz: " + LsaResToStr(lstatz, 6))
        console.log("a: " + a.toFixed(8))
        console.log("b: " + b.toFixed(8))
        */
        return (1000.0 * (sin(lstatm.aoi) * sin(lstatm.aoi) / 2.0) * (refocus - a * rsq / 2.0 - b * rsqsq / 3.0) / lens.wavelength);
    }
    function CalcLSAVecs(p0, e0, lens, refocus) {
        // taken from rust implementation
        //let aoi = self.edir.dot_product(&CPROPV).acos();
        //let lsa = -1.0 * (self.pvector.x.powi(2) + self.pvector.y.powi(2)).sqrt() / aoi.tan();
        //(aoi, lsa)
        let rayout = trace3DRay(p0, e0, lens, refocus);
        let aoi = acos(Vector3D.dotProduct(rayout.eDir, zeroDir$1));
        let lsa = -1.0 * sqrt(rayout.pVector.x * rayout.pVector.x + rayout.pVector.y * rayout.pVector.y) / tan(aoi);
        let lsares = { rayout: rayout, lsa: lsa, aoi: aoi };
        return lsares; // calls to this function expect radians
    }

    const zeroDir = new Vector3D(0.0, 0.0, 1.0);
    // this function can be used to produce a WFE grid that can be turned into a bitmap or 2d wavefront map
    // this will only be useful I guess until the GPU calculators get going???
    function GenWfeMapBits(lens, refocus, halfCa, gridsize) {
        var wfemap = new Array();
        let inc = 2.0 * halfCa / (gridsize - 1);
        const diag = halfCa * halfCa * 1.0001; // add a little extra to make sure and get the cardinal points
        let min = 1e20;
        let max = -1e20;
        let ctx = 0;
        let sum = 0;
        let sumsum = 0;
        for (let row = 0; row < gridsize; row++) {
            wfemap[row] = new Array();
            for (let col = 0; col < gridsize; col++) {
                let x = -halfCa + row * inc;
                let y = -halfCa + col * inc;
                if (diag > (x * x + y * y)) {
                    let p = new Vector3D(x, y, 0.0);
                    wfemap[row][col] = calcWfeVecs(p, zeroDir, lens, refocus);
                    if (wfemap[row][col] < min) {
                        min = wfemap[row][col];
                    }
                    if (wfemap[row][col] > max) {
                        max = wfemap[row][col];
                    }
                    sum += wfemap[row][col];
                    sumsum += wfemap[row][col] * wfemap[row][col];
                    ctx += 1;
                }
                else
                    wfemap[row][col] = NaN;
            }
        }
        let varirms = sqrt((sumsum - sum * sum / ctx) / (ctx - 1.0));
        let diff = max - min;
        // put into array
        for (let row = 0; row < gridsize; row++) {
            for (let col = 0; col < gridsize; col++) {
                if (!isNaN(wfemap[row][col])) {
                    wfemap[row][col] = round(122.0 * (wfemap[row][col] - min) / diff);
                }
                else {
                    wfemap[row][col] = 123;
                }
            }
        }
        console.log("Mapper WFE RMS: " + varirms);
        return wfemap;
    }
    // this function can be used to produce a WFE grid that can be turned into a bitmap or 2d wavefront map
    // this will only be useful I guess until the GPU calculators get going???
    function GenFlatWfeMapBits(lens, refocus, halfCa, gridsize) {
        var wfemap = new Array();
        let inc = 2.0 * halfCa / (gridsize - 1);
        const diag = halfCa * halfCa * 1.0001; // add a little extra to make sure and get the cardinal points
        let min = 1e20;
        let max = -1e20;
        let ctx = 0;
        let sum = 0;
        let sumsum = 0;
        for (let row = 0; row < gridsize; row++) {
            for (let col = 0; col < gridsize; col++) {
                let x = -halfCa + row * inc;
                let y = -halfCa + col * inc;
                if (diag > (x * x + y * y)) {
                    let p = new Vector3D(x, y, 0.0);
                    let wfe = calcWfeVecs(p, zeroDir, lens, refocus);
                    if (wfe < min) {
                        min = wfe;
                    }
                    if (wfe > max) {
                        max = wfe;
                    }
                    sum += wfe;
                    sumsum += wfe * wfe;
                    ctx += 1;
                    wfemap.push(wfe);
                }
                else
                    wfemap.push(NaN);
            }
        }
        let varirms = sqrt((sumsum - sum * sum / ctx) / (ctx - 1.0));
        let diff = max - min;
        // put into array
        for (let i = 0; i < gridsize * gridsize; i++) {
            if (!isNaN(wfemap[i])) {
                wfemap[i] = round(122.0 * (wfemap[i] - min) / diff);
            }
            else {
                wfemap[i] = 123;
            }
        }
        console.log("Mapper WFE RMS: " + varirms);
        return wfemap;
    }

    var MaterialType;
    (function (MaterialType) {
        MaterialType[MaterialType["ZnSe"] = 0] = "ZnSe";
        MaterialType[MaterialType["FusedSilica"] = 1] = "FusedSilica";
        MaterialType[MaterialType["ZnS"] = 2] = "ZnS";
        MaterialType[MaterialType["Ge"] = 3] = "Ge";
        MaterialType[MaterialType["GaAs"] = 4] = "GaAs";
        MaterialType[MaterialType["CdTe"] = 5] = "CdTe";
        MaterialType[MaterialType["BaF2"] = 6] = "BaF2";
        MaterialType[MaterialType["CaF2"] = 7] = "CaF2";
        MaterialType[MaterialType["Silicon"] = 8] = "Silicon";
        MaterialType[MaterialType["Diamond"] = 9] = "Diamond";
        MaterialType[MaterialType["Al2O3"] = 10] = "Al2O3";
        MaterialType[MaterialType["PbF2"] = 11] = "PbF2";
        MaterialType[MaterialType["ThF4"] = 12] = "ThF4";
        MaterialType[MaterialType["MgF2"] = 13] = "MgF2";
        MaterialType[MaterialType["MgO"] = 14] = "MgO";
        MaterialType[MaterialType["TiO2"] = 15] = "TiO2";
        MaterialType[MaterialType["As2S3"] = 16] = "As2S3";
        MaterialType[MaterialType["NaCl"] = 17] = "NaCl";
        MaterialType[MaterialType["KBr"] = 18] = "KBr";
        MaterialType[MaterialType["KCl"] = 19] = "KCl";
        MaterialType[MaterialType["CsI"] = 20] = "CsI";
        MaterialType[MaterialType["CsBr"] = 21] = "CsBr";
        MaterialType[MaterialType["Se"] = 22] = "Se";
        MaterialType[MaterialType["AMTIR1"] = 23] = "AMTIR1";
        MaterialType[MaterialType["NaF2"] = 24] = "NaF2";
    })(MaterialType || (MaterialType = {}));
    class Material {
        constructor(type, minWlen, maxWlen, sourceLiterature, associatedData, calcFunc = lookupIndex) {
            this.type = type;
            this.minWlen = minWlen;
            this.maxWlen = maxWlen;
            this.sourceLiterature = sourceLiterature;
            this.associatedData = associatedData;
            this.calcFunc = calcFunc;
        }
        nIndexAt(wavelength) {
            if (wavelength < this.minWlen || wavelength > this.maxWlen) {
                throw new Error(`Wavelength out of range for "${this.toString()}" (min: ${this.minWlen}, max: ${this.maxWlen})`);
            }
            return this.calcFunc(wavelength, this.associatedData);
        }
        get color() {
            switch (this.type) {
                case MaterialType.ZnSe:
                    return '#FFA500';
                case MaterialType.FusedSilica:
                    return '#ADD8E6';
                default:
                    return '#eee';
            }
        }
        static fromString(s) {
            switch (s) {
                case 'ZnSe':
                    return Material.ZnSe;
                case 'FusedSilica':
                    return Material.FusedSilica;
                case 'ZnS':
                    return Material.ZnS;
                case 'Ge':
                    return Material.Ge;
                case 'GaAs':
                    return Material.GaAs;
                case 'CdTe':
                    return Material.CdTe;
                case 'BaF2':
                    return Material.BaF2;
                case 'CaF2':
                    return Material.CaF2;
                case 'Silicon':
                    return Material.Silicon;
                case 'Diamond':
                    return Material.Diamond;
                case 'Al2O3':
                    return Material.Al2O3;
                case 'PbF2':
                    return Material.PbF2;
                case 'ThF4':
                    return Material.ThF4;
                case 'MgF2':
                    return Material.MgF2;
                case 'MgO':
                    return Material.MgO;
                case 'TiO2':
                    return Material.TiO2;
                case 'As2S3':
                    return Material.As2S3;
                case 'NaCl':
                    return Material.NaCl;
                case 'KBr':
                    return Material.KBr;
                case 'KCl':
                    return Material.KCl;
                case 'CsI':
                    return Material.CsI;
                case 'CsBr':
                    return Material.CsBr;
                case 'Se':
                    return Material.Se;
                case 'AMTIR1':
                    return Material.AMTIR1;
                case 'NaF2':
                    return Material.NaF2;
                default:
                    throw new Error(`Material not found: ${s}`);
            }
        }
        toString() {
            return MaterialType[this.type];
        }
        /*
          static get allMaterials() {
            return Object.values(MaterialType)
              .filter((n) => typeof n === 'string')
              .sort() as string[]
          }
        */
        static get ZnSe() {
            return new Material(MaterialType.ZnSe, 0.5, 22, 'II-VI Researched', [4.3809835, 0.19656967, 0.5445451, 0.3854439, 2.889225, 47.0210925], sell1);
        }
        static get CdTe() {
            return new Material(MaterialType.CdTe, 1.0, 30.0, 'Dodge and Malitson', [3.7575, 3.4632, 0.1866, 6.238, 9273.0], sell0);
        }
        static get BaF2() {
            return new Material(MaterialType.BaF2, 0.1345, 15.0, 'Unknown', [0.643356, 0.057789, 0.506762, 0.10968, 3.8261, 46.3864], sell1);
        }
        static get CaF2() {
            return new Material(MaterialType.CaF2, 0.125, 12.0, 'Unknown', [0.5675888, 0.050263605, 0.4710914, 0.1003909, 3.8484723, 34.64904], sell1);
        }
        static get Silicon() {
            return new Material(MaterialType.Silicon, 1.36, 11.0, 'Handbook of Optics, 3rd edition, Vol. 4. McGraw-Hill 2009', [10.6684293, 0.301516485, 0.003043475, 1.13475115, 1.54133408, 1104.0], sell1);
        }
        static get Diamond() {
            return new Material(MaterialType.Diamond, 0.225, 100, 'http://refractiveindex.info/?group=CRYSTALS&material=C', [4.3356, 0.106, 0.3306, 0.175], sell3);
        }
        static get GaAs() {
            return new Material(MaterialType.GaAs, 2.5, 14, 'Unknown', [
                [2.5, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0],
                [
                    3.3256, 3.3169, 3.3069, 3.301, 3.2963, 3.2923, 3.2878, 3.283, 3.277, 3.2725, 3.2666, 3.2589,
                    3.2509,
                ],
            ]);
        }
        static get Ge() {
            return new Material(MaterialType.Ge, 2.0581, 13.02, 'old Melles Groit catalogue', [
                [
                    2.0581, 2.1526, 2.3126, 2.4374, 2.577, 2.7144, 2.998, 3.3033, 3.1488, 4.258, 4.866, 6.238,
                    8.66, 9.72, 11.04, 12.2, 13.02,
                ],
                [
                    4.1018, 4.0919, 4.0785, 4.0709, 4.0608, 4.0554, 4.0452, 4.0372, 4.0339, 4.0217, 4.0167,
                    4.0095, 4.0043, 4.0033, 4.0025, 4.002, 4.0018,
                ],
            ]);
        }
        static get ZnS() {
            return new Material(MaterialType.ZnS, 0.42, 18.2, 'Raytheon data, via M. J. Dodge', [
                [
                    0.42, 0.46, 0.5, 0.54, 0.58, 0.62, 0.66, 0.7, 0.74, 0.78, 0.82, 0.86, 0.9, 0.94, 0.98, 1.0,
                    1.4, 1.8, 2.2, 2.6, 3.0, 3.4, 3.8, 4.2, 4.6, 5.0, 5.4, 5.8, 6.2, 6.6, 7.0, 7.4, 7.8, 8.2,
                    8.6, 9.0, 9.4, 9.8, 10.2, 10.6, 11.0, 11.4, 11.8, 12.2, 12.6, 13.0, 13.4, 13.8, 14.2, 14.6,
                    15.0, 15.4, 15.8, 16.2, 16.6, 17.0, 17.4, 17.8, 18.2,
                ],
                [
                    2.516, 2.458, 2.419, 2.391, 2.371, 2.355, 2.342, 2.332, 2.323, 2.316, 2.31, 2.305, 2.301,
                    2.297, 2.294, 2.292, 2.257, 2.267, 2.263, 2.26, 2.257, 2.255, 2.253, 2.251, 2.248, 2.246,
                    2.244, 2.241, 2.238, 2.235, 2.232, 2.228, 2.225, 2.221, 2.217, 2.212, 2.208, 2.203, 2.198,
                    2.192, 2.186, 2.18, 2.173, 2.167, 2.159, 2.152, 2.143, 2.135, 2.126, 2.116, 2.106, 2.095,
                    2.084, 2.072, 2.059, 2.045, 2.03, 2.015, 1.998,
                ],
            ]);
        }
        static get Al2O3() {
            return new Material(MaterialType.Al2O3, 0.2652, 5.577, '(Sapphire) Optl. Matls. for IR Instr. or Optovac Catalogue ', [
                [
                    0.2652, 0.2803, 0.2894, 0.2967, 0.3021, 0.313, 0.3341, 0.3466, 0.3611, 0.365, 0.3906,
                    0.4047, 0.4358, 0.5461, 0.577, 0.5791, 0.6438, 0.7065, 0.8521, 0.8944, 1.014, 1.1287,
                    1.3673, 1.3951, 1.5295, 1.6932, 1.7091, 1.8131, 1.9701, 2.1526, 2.2493, 2.3254, 2.4374,
                    3.2432, 3.2666, 3.303, 3.3293, 3.4188, 3.5078, 3.7, 4.258, 4.954, 5.1456, 5.349, 5.419,
                    5.577,
                ],
                [
                    1.8336, 1.8243, 1.8195, 1.8159, 1.8135, 1.8091, 1.8018, 1.7981, 1.7945, 1.7936, 1.7884,
                    1.7858, 1.7812, 1.7708, 1.7688, 1.7687, 1.7655, 1.763, 1.7588, 1.7579, 1.7555, 1.7534,
                    1.7494, 1.7489, 1.7466, 1.7437, 1.7434, 1.7414, 1.7383, 1.7344, 1.7323, 1.7306, 1.7278,
                    1.7044, 1.7036, 1.7023, 1.7015, 1.6982, 1.695, 1.6875, 1.6637, 1.6266, 1.6151, 1.602,
                    1.5973, 1.5864,
                ],
            ]);
        }
        static get PbF2() {
            return new Material(MaterialType.PbF2, 0.2909, 11.862, 'Harshaw catalogue', [
                [
                    0.2909, 0.2967, 0.3022, 0.3351, 0.365, 0.3663, 0.4047, 0.4358, 0.4678, 0.48, 0.5086, 0.5461,
                    0.577, 0.579, 0.5876, 0.6438, 0.6678, 0.7065, 0.8521, 0.8944, 1.014, 1.083, 1.129, 1.36,
                    1.395, 1.47, 1.53, 1.693, 1.714, 1.813, 1.97, 2.325, 2.577, 2.574, 3.244, 3.267, 6.412,
                    6.708, 6.787, 7.388, 11.035, 11.475, 11.862,
                ],
                [
                    1.9722, 1.9471, 1.9299, 1.8704, 1.8408, 1.8398, 1.8156, 1.8016, 1.7907, 1.7873, 1.7802,
                    1.7729, 1.768, 1.7677, 1.7665, 1.7599, 1.7577, 1.7545, 1.7463, 1.7447, 1.7411, 1.7395,
                    1.7387, 1.7352, 1.7348, 1.734, 1.7334, 1.7321, 1.7319, 1.7312, 1.7301, 1.7279, 1.7262,
                    1.7258, 1.7221, 1.7219, 1.6929, 1.6892, 1.6882, 1.6802, 1.6155, 1.6058, 1.5969,
                ],
            ]);
        }
        static get ThF4() {
            return new Material(MaterialType.ThF4, 0.3, 25.0, 'M. Bob, Various Guestimates collected from articles', [
                [0.3, 3.8, 5.3, 10.6, 14.0, 16.0, 25.0],
                [1.58, 1.5, 1.49, 1.35, 1.32, 1.3, 1.28],
            ]);
        }
        static get MgF2() {
            return new Material(MaterialType.MgF2, 1, 9, 'Kodak Flyer', [
                [
                    1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 4.75, 5.0,
                    5.25, 5.5, 5.75, 6.0, 6.25, 6.5, 6.75, 7.0, 7.25, 7.5, 7.75, 8.0, 8.25, 8.5, 8.75, 9.0,
                ],
                [
                    1.3778, 1.3763, 1.3794, 1.3735, 1.372, 1.3702, 1.3683, 1.3663, 1.364, 1.3614, 1.3587,
                    1.3558, 1.3526, 1.3492, 1.3455, 1.3416, 1.3374, 1.3329, 1.3282, 1.3232, 1.3179, 1.3122,
                    1.3063, 1.3, 1.2934, 1.2865, 1.2792, 1.2715, 1.2634, 1.2549, 1.246, 1.2367, 1.2269,
                ],
            ]);
        }
        static get MgO() {
            return new Material(MaterialType.MgO, 0.3612, 9.0, 'Optl. Matls. for IR Instr. and Kodak', [
                [
                    0.3612, 0.365, 1.0, 1.014, 1.1287, 1.25, 1.3673, 1.5, 1.5295, 1.6932, 1.7092, 1.75, 1.8131,
                    1.9701, 2.0, 2.2493, 2.25, 2.3254, 2.5, 2.75, 3.0, 3.25, 3.3033, 3.5, 3.5078, 3.75, 4.0,
                    4.25, 4.258, 4.5, 4.75, 5.0, 5.138, 5.25, 5.35, 5.5, 5.75, 6.0, 6.25, 6.5, 6.75, 7.0, 7.25,
                    7.5, 7.75, 8.0, 8.25, 8.5, 8.75, 9.0,
                ],
                [
                    1.7732, 1.7719, 1.7227, 1.7226, 1.7206, 1.7188, 1.7171, 1.7156, 1.715, 1.7128, 1.7126,
                    1.7123, 1.7111, 1.7088, 1.7089, 1.7047, 1.7052, 1.7035, 1.7012, 1.6968, 1.692, 1.6868,
                    1.6853, 1.6811, 1.6805, 1.675, 1.6684, 1.6612, 1.6604, 1.6536, 1.6455, 1.6368, 1.6314,
                    1.6275, 1.624, 1.6177, 1.6072, 1.5962, 1.5845, 1.5721, 1.559, 1.5452, 1.5307, 1.5154,
                    1.4993, 1.4824, 1.4646, 1.446, 1.4265, 1.406,
                ],
            ]);
        }
        static get TiO2() {
            return new Material(MaterialType.TiO2, 0.4358, 5.5, 'Optovac Catalogue', [
                [
                    0.4358, 0.4916, 0.496, 0.5461, 0.577, 0.5791, 0.6907, 0.7082, 1.014, 1.5296, 2.0, 2.5, 3.0,
                    3.5, 4.0, 4.5, 5.0, 5.5,
                ],
                [
                    2.853, 2.723, 2.715, 2.652, 2.623, 2.621, 2.555, 2.548, 2.483, 2.451, 2.399, 2.387, 2.38,
                    2.367, 2.35, 2.322, 2.29, 2.2,
                ],
            ]);
        }
        static get As2S3() {
            return new Material(MaterialType.As2S3, 0.577, 11.862, 'Optl. Matls. for IR Instr.', [
                [
                    0.577, 0.579, 0.5876, 0.6439, 0.6678, 0.6908, 0.7065, 0.8521, 0.8944, 1.014, 1.1287, 1.3951,
                    1.5295, 1.7006, 1.8131, 1.9701, 3.4188, 4.258, 5.138, 6.238, 6.692, 8.662, 9.724, 11.035,
                    11.475, 11.862,
                ],
                [
                    2.6632, 2.6605, 2.6501, 2.5976, 2.5808, 2.567, 2.5586, 2.5061, 2.4963, 2.4757, 2.4623,
                    2.4438, 2.438, 2.4326, 2.43, 2.4268, 2.4137, 2.4101, 2.4067, 2.4022, 2.1003, 2.3903, 2.3834,
                    2.3736, 2.3694, 2.3658,
                ],
            ]);
        }
        static get FusedSilica() {
            return new Material(MaterialType.FusedSilica, 0.34, 3.5, 'Unknown', [
                [
                    0.34, 0.35, 0.36, 0.37, 0.38, 0.39, 0.4, 0.41, 0.42, 0.43, 0.44, 0.45, 0.46, 0.47, 0.48,
                    0.49, 0.5, 0.51, 0.52, 0.53, 0.54, 0.55, 0.56, 0.57, 0.58, 0.59, 0.6, 0.61, 0.62, 0.63,
                    0.64, 0.65, 0.66, 0.67, 0.68, 0.69, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7,
                    1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 3.4, 3.5,
                ],
                [
                    1.4788, 1.477, 1.4754, 1.4739, 1.4726, 1.4713, 1.4702, 1.4691, 1.4682, 1.4673, 1.4664,
                    1.4656, 1.4649, 1.4642, 1.4636, 1.463, 1.4624, 1.4619, 1.4613, 1.4609, 1.4604, 1.46, 1.4596,
                    1.4592, 1.4588, 1.4584, 1.4581, 1.4578, 1.4575, 1.4572, 1.4569, 1.4566, 1.4563, 1.4561,
                    1.4558, 1.4556, 1.4553, 1.4534, 1.4518, 1.4505, 1.4493, 1.4481, 1.447, 1.4458, 1.4447,
                    1.4435, 1.4422, 1.4409, 1.4396, 1.4382, 1.4367, 1.4351, 1.4335, 1.4317, 1.4299, 1.428,
                    1.426, 1.4239, 1.4217, 1.4194, 1.4169, 1.4144, 1.4117, 1.4089, 1.406,
                ],
            ]);
        }
        static get NaCl() {
            return new Material(MaterialType.NaCl, 0.5, 22.3, 'Optovac Catalogue and Optl.Matl.for IR', [
                [
                    0.5, 0.589, 0.64, 0.6874, 0.7604, 0.7858, 0.8835, 0.9033, 0.9724, 1.0, 1.0084, 1.054, 1.081,
                    1.1058, 1.142, 1.1486, 1.2016, 1.2604, 1.3126, 1.4874, 1.5552, 1.6368, 1.6848, 1.767, 2.0,
                    2.0736, 2.1824, 2.2464, 2.356, 2.6505, 2.9466, 3.0, 3.2736, 3.5359, 3.6288, 3.8192, 4.0,
                    4.123, 4.712, 5.0, 5.0092, 5.3009, 5.8932, 6.0, 6.4825, 6.8, 7.0, 7.0718, 7.22, 7.59,
                    7.6611, 7.9558, 8.0, 8.04, 8.8398, 9.0, 9.5, 10.0, 10.0184, 11.0, 11.7864, 12.5, 12.965,
                    13.0, 14.1436, 14.733, 15.3223, 15.9116, 17.93, 20.57, 22.3,
                ],
                [
                    1.544, 1.5443, 1.5414, 1.5393, 1.5368, 1.5361, 1.5339, 1.5336, 1.5325, 1.532, 1.5321,
                    1.5315, 1.5312, 1.531, 1.5306, 1.5303, 1.5301, 1.5297, 1.5294, 1.5284, 1.5281, 1.5278,
                    1.5276, 1.5274, 1.527, 1.5265, 1.5262, 1.5261, 1.5258, 1.5251, 1.5247, 1.523, 1.5237,
                    1.5231, 1.5229, 1.5224, 1.521, 1.5216, 1.5198, 1.519, 1.5188, 1.5179, 1.5159, 1.515, 1.5135,
                    1.512, 1.51, 1.5109, 1.5102, 1.5085, 1.5082, 1.5066, 1.506, 1.5064, 1.5019, 1.501, 1.4998,
                    1.495, 1.4946, 1.488, 1.4817, 1.4757, 1.4716, 1.4666, 1.4604, 1.4543, 1.4474, 1.4409,
                    1.4149, 1.3735, 1.3403,
                ],
            ]);
        }
        static get KBr() {
            return new Material(MaterialType.KBr, 0.4047, 25.14, 'Unknown', [
                [
                    0.4047, 0.4358, 0.4861, 0.5086, 0.5461, 0.5876, 0.6438, 0.7065, 1.014, 1.1287, 1.3673,
                    1.7012, 2.44, 2.73, 3.419, 4.258, 6.238, 6.692, 8.662, 9.724, 11.035, 11.862, 14.29, 14.98,
                    17.4, 18.16, 19.01, 19.91, 21.18, 21.83, 23.86, 25.14,
                ],
                [
                    1.5898, 1.5815, 1.5718, 1.5685, 1.5639, 1.56, 1.5559, 1.5524, 1.5441, 1.5426, 1.5406, 1.539,
                    1.5373, 1.5369, 1.5361, 1.5352, 1.5329, 1.5322, 1.529, 1.5269, 1.524, 1.522, 1.515, 1.5128,
                    1.5039, 1.5008, 1.497, 1.4929, 1.4865, 1.4831, 1.4714, 1.4632,
                ],
            ]);
        }
        static get KCl() {
            return new Material(MaterialType.KCl, 0.21, 18.8, 'Unknown', [
                [0.21, 0.5, 1.2, 2.3573, 4.7, 5.3039, 10.184, 14.1, 15.912, 18.1, 18.8],
                [1.72, 1.49, 1.48, 1.4747, 1.47, 1.47, 1.4567, 1.44, 1.4262, 1.41, 1.401],
            ]);
        }
        static get CsI() {
            return new Material(MaterialType.CsI, 0.5, 50.0, 'Unknown', [
                [
                    0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0,
                    17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0, 25.0, 26.0, 27.0, 28.0, 29.0, 30.0, 31.0,
                    32.0, 33.0, 34.0, 35.0, 36.0, 37.0, 38.0, 39.0, 40.0, 41.0, 42.0, 43.0, 44.0, 45.0, 46.0,
                    47.0, 48.0, 49.0, 50.0,
                ],
                [
                    1.8063, 1.7572, 1.7462, 1.744, 1.743, 1.7424, 1.7418, 1.7412, 1.7406, 1.7399, 1.7392,
                    1.7383, 1.7375, 1.7365, 1.7355, 1.7344, 1.7332, 1.7319, 1.7306, 1.7291, 1.7276, 1.726,
                    1.7243, 1.7226, 1.7207, 1.7188, 1.7168, 1.7146, 1.7124, 1.7101, 1.7077, 1.7052, 1.7027, 1.7,
                    1.6972, 1.6943, 1.6913, 1.6881, 1.6849, 1.6816, 1.6781, 1.6746, 1.6709, 1.6671, 1.6631,
                    1.659, 1.6548, 1.6505, 1.646, 1.6414, 1.6366,
                ],
            ]);
        }
        static get CsBr() {
            return new Material(MaterialType.CsBr, 0.5, 39.0, 'Unknown', [
                [
                    0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0,
                    17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0, 25.0, 26.0, 27.0, 28.0, 29.0, 30.0, 31.0,
                    32.0, 33.0, 34.0, 35.0, 36.0, 37.0, 38.0, 39.0,
                ],
                [
                    1.709, 1.6779, 1.6706, 1.669, 1.6681, 1.6674, 1.6666, 1.6657, 1.6648, 1.6637, 1.6625,
                    1.6612, 1.6598, 1.6582, 1.6565, 1.6547, 1.6527, 1.6506, 1.6484, 1.646, 1.6435, 1.6408,
                    1.638, 1.635, 1.6319, 1.6286, 1.6251, 1.6215, 1.6176, 1.1636, 1.6095, 1.6051, 1.6005,
                    1.5958, 1.5908, 1.5856, 1.5802, 1.5745, 1.5686, 1.5624,
                ],
            ]);
        }
        static get Se() {
            return new Material(MaterialType.Se, 2.5, 15.0, 'Unknown', [
                [2.5, 5.0, 15.0],
                [2.45, 2.42, 2.38],
            ]);
        }
        static get AMTIR1() {
            return new Material(MaterialType.AMTIR1, 1.0, 14.0, 'Amorphous Materials Catalogue', [
                [1.0, 1.064, 1.5, 2.0, 2.4, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0],
                [
                    2.6055, 2.5933, 2.5469, 2.531, 2.525, 2.5187, 2.5141, 2.5109, 2.508, 2.5057, 2.5034, 2.5005,
                    2.4976, 2.4936, 2.4904, 2.485, 2.4825,
                ],
            ]);
        }
        static get NaF2() {
            return new Material(MaterialType.NaF2, 0.186, 17.3, 'Unknown', [
                [
                    0.186, 0.199, 0.203, 0.302, 0.405, 0.486, 0.546, 0.589, 0.707, 0.811, 0.912, 1.014, 2.0,
                    3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.3, 11.3, 12.5, 13.8, 15.1, 16.7, 17.3,
                ],
                [
                    1.393, 1.3805, 1.3772, 1.3423, 1.3319, 1.3282, 1.3264, 1.3255, 1.3237, 1.3227, 1.322,
                    1.3215, 1.317, 1.313, 1.308, 1.301, 1.292, 1.281, 1.269, 1.262, 1.233, 1.209, 1.18, 1.142,
                    1.093, 1.034, 1.0,
                ],
            ]);
        }
    }
    function lookupIndex(w, table) {
        for (let i = 0; i < table[0].length; i++) {
            if (w >= table[0][i] && w <= table[0][i + 1]) {
                return (table[1][i] +
                    ((table[1][i + 1] - table[1][i]) / (table[0][i + 1] - table[0][i])) * (w - table[0][i]));
            }
        }
        throw new Error(`Could not determine index from table for wavelength ${w}`);
    }
    // CdTe
    function sell0(w, sell0) {
        return Math.sqrt(sell0[0] + (sell0[1] * w ** 2) / (w ** 2 - sell0[2]) + (sell0[3] * w ** 2) / (w ** 2 - sell0[4]));
    }
    // ZnSe, BaF2, CaF2, Silicon
    function sell1(w, sell1) {
        return Math.sqrt(1.0 +
            (sell1[0] * w ** 2) / (w ** 2 - sell1[1] * sell1[1]) +
            (sell1[2] * w ** 2) / (w ** 2 - sell1[3] * sell1[3]) +
            (sell1[4] * w ** 2) / (w ** 2 - sell1[5] * sell1[5]));
    }
    // Diamond
    function sell3(w, sell3) {
        return Math.sqrt(1.0 +
            (sell3[0] * w * w) / (w * w - sell3[1] * sell3[1]) +
            (sell3[2] * w * w) / (w * w - sell3[3] * sell3[3]));
    }

    class Surface {
        constructor(fullAperture, radius, conic = 0, ad = 0, ae = 0) {
            this.ap = typeof fullAperture === 'string' ? parseFloat(fullAperture) : fullAperture;
            this.r = typeof radius === 'string' ? parseFloat(radius) : radius;
            this.k = typeof conic === 'string' ? parseFloat(conic) : conic;
            this.ad = typeof ad === 'string' ? parseFloat(ad) : ad;
            this.ae = typeof ae === 'string' ? parseFloat(ae) : ae;
        }
        get type() {
            if (Math.abs(this.r) < 0.01 &&
                Math.abs(this.k) < 1e-8 &&
                Math.abs(this.ad) < 1e-20 &&
                Math.abs(this.ae) < 1e-20) {
                return 'plane';
            }
            if (Math.abs(this.ad) < 1e-20 && Math.abs(this.ae) < 1e-20) {
                return 'sphere';
            }
            return 'asphere';
        }
        static calcCurv(r) {
            if (typeof r === 'string') {
                r = parseFloat(r);
            }
            return r === 0 ? 0 : 1 / r;
        }
        get c() {
            return Surface.calcCurv(this.r);
        }
        set c(c) {
            this.r = Surface.calcCurv(c);
        }
        static calcSag(radius, conic, ad, ae, x, y = 0) {
            const c = Surface.calcCurv(radius);
            const hyp = x ** 2 + y ** 2;
            const sqrtvalue = 1 - (1 + conic) * c ** 2 * hyp;
            return sqrtvalue < 0
                ? 0
                : (c * hyp) / (1 + Math.sqrt(sqrtvalue)) + ad * hyp ** 2 + ae * hyp ** 3;
        }
        sagAt(x, y = 0) {
            return Surface.calcSag(this.r, this.k, this.ad, this.ae, x, y);
        }
        get sag() {
            return this.sagAt(this.ap / 2);
        }
        // need to format the values to match the struct in rust
        toRustStruct() {
            return {
                r: this.r,
                c: this.c,
                k: this.k,
                ad: this.ad,
                ae: this.ae,
                surf_type: this.type === 'plane' ? 0 : this.type === 'sphere' ? 1 : 2,
            };
        }
    }
    class Lens {
        constructor(diameter, ct, material, wavelength, surf1, surf2) {
            if (surf1.ap > this.diameter || surf2.ap > this.diameter) {
                throw new Error("Surface aperture can't be greater than lens diameter.");
            }
            this.diameter = typeof diameter === 'string' ? parseFloat(diameter) : diameter;
            this.ct = typeof ct === 'string' ? parseFloat(ct) : ct;
            this.material = material;
            this.wavelength = typeof wavelength === 'string' ? parseFloat(wavelength) : wavelength;
            this.surf1 = surf1;
            this.surf2 = surf2;
        }
        static testLens() {
            return new Lens(25, 5, Material.FusedSilica, 1.07, new Surface(25, 44.966), new Surface(25, -1000));
        }
        get et() {
            return this.ct - this.surf1.sag + this.surf2.sag;
        }
        set et(val) {
            console.log('vallll', val);
            val = typeof val === 'string' ? parseFloat(val) : val;
            this.ct = val + this.surf1.sag - this.surf2.sag;
        }
        get flat1() {
            return (this.diameter - this.surf1.ap) / 2;
        }
        get flat2() {
            return (this.diameter - this.surf2.ap) / 2;
        }
        get nIndex() {
            return this.material.nIndexAt(this.wavelength);
        }
        static calcEFL(s1c, s2c, ct, nIndex) {
            s1c = typeof s1c === 'string' ? parseFloat(s1c) : s1c;
            s2c = typeof s2c === 'string' ? parseFloat(s2c) : s2c;
            ct = typeof ct === 'string' ? parseFloat(ct) : ct;
            nIndex = typeof nIndex === 'string' ? parseFloat(nIndex) : nIndex;
            const phi = (nIndex - 1) * (s1c - s2c + ((nIndex - 1) * ct * s1c * s2c) / nIndex);
            return 1 / phi;
        }
        get EFL() {
            return Lens.calcEFL(this.surf1.c, this.surf2.c, this.ct, this.nIndex);
        }
        static calcBFL(s1c, s2c, ct, nIndex) {
            s1c = typeof s1c === 'string' ? parseFloat(s1c) : s1c;
            s2c = typeof s2c === 'string' ? parseFloat(s2c) : s2c;
            ct = typeof ct === 'string' ? parseFloat(ct) : ct;
            nIndex = typeof nIndex === 'string' ? parseFloat(nIndex) : nIndex;
            const efl = Lens.calcEFL(s1c, s2c, ct, nIndex);
            const pp = (nIndex - 1) * s1c * efl * (1 / nIndex) * ct;
            return efl - pp;
        }
        get BFL() {
            return Lens.calcBFL(this.surf1.c, this.surf2.c, this.ct, this.nIndex);
        }
        // need to format the values to match the struct in rust
        toRustStruct() {
            return {
                diameter: this.diameter,
                // TODO: figure out best meaning for clear_ap here
                clear_ap: Math.min(this.surf1.ap, this.surf2.ap),
                ct: this.ct,
                n_index: this.nIndex,
                side1: this.surf1.toRustStruct(),
                side2: this.surf2.toRustStruct(),
            };
        }
    }

    function addTwoNums(n1, n2) {
        return n1 + n2;
    }
    function getarray(gridsize) {
        let surf1 = new Surface(25, 44.966, 0.0, 0.0, 0.0);
        let surf2 = new Surface(25, -1000, 0.0, 0.0, 0.0);
        let mat = Material.fromString("FusedSilica");
        let lens = new Lens(25, 5, mat, 1.07, surf1, surf2);
        let newmap = GenWfeMapBits(lens, -0.711, 10.0, gridsize);
        return newmap;
    }
    function getflatarray(gridsize) {
        let surf1 = new Surface(25, 44.966, 0.0, 0.0, 0.0);
        let surf2 = new Surface(25, -1000, 0.0, 0.0, 0.0);
        let mat = Material.fromString("FusedSilica");
        let lens = new Lens(25, 5, mat, 1.07, surf1, surf2);
        let newmap = GenFlatWfeMapBits(lens, -0.711, 10.0, gridsize);
        return newmap;
    }

    let testmap = [[123, 123, 123, 123, 123, 122, 123, 123, 123, 123, 123],
        [123, 123, 122, 77, 56, 49, 56, 77, 122, 123, 123],
        [123, 122, 62, 32, 19, 15, 19, 32, 62, 122, 123],
        [123, 77, 32, 12, 5, 3, 5, 12, 32, 77, 123],
        [123, 56, 19, 5, 1, 0, 1, 5, 19, 56, 123],
        [122, 49, 15, 3, 0, 0, 0, 3, 15, 49, 122],
        [123, 56, 19, 5, 1, 0, 1, 5, 19, 56, 123],
        [123, 77, 32, 12, 5, 3, 5, 12, 32, 77, 123],
        [123, 122, 62, 32, 19, 15, 19, 32, 62, 122, 123],
        [123, 123, 122, 77, 56, 49, 56, 77, 122, 123, 123],
        [123, 123, 123, 123, 123, 122, 123, 123, 123, 123, 123]];
    let colormap = [[40, 0, 60],
        [50, 0, 70],
        [60, 0, 80],
        [70, 0, 85],
        [80, 0, 90],
        [95, 0, 100],
        [105, 0, 110],
        [115, 0, 115],
        [125, 0, 115],
        [140, 0, 115],
        [155, 0, 115],
        [170, 0, 115],
        [185, 0, 115],
        [200, 0, 125],
        [210, 0, 135],
        [220, 0, 150],
        [220, 0, 180],
        [205, 0, 200],
        [205, 0, 230],
        [190, 0, 255],
        [170, 0, 255],
        [150, 0, 255],
        [130, 0, 255],
        [110, 0, 255],
        [80, 0, 255],
        [40, 0, 255],
        [0, 0, 255],
        [0, 0, 245],
        [0, 0, 235],
        [0, 0, 225],
        [0, 0, 215],
        [0, 0, 205],
        [0, 35, 205],
        [0, 50, 205],
        [0, 65, 205],
        [0, 80, 205],
        [0, 95, 205],
        [0, 105, 210],
        [0, 115, 220],
        [0, 125, 225],
        [0, 125, 235],
        [0, 135, 240],
        [0, 145, 250],
        [0, 155, 255],
        [0, 170, 255],
        [0, 185, 255],
        [0, 195, 255],
        [0, 210, 255],
        [0, 230, 255],
        [0, 245, 255],
        [0, 255, 235],
        [0, 255, 220],
        [0, 255, 180],
        [0, 255, 140],
        [0, 255, 80],
        [0, 255, 0],
        [0, 240, 0],
        [0, 235, 0],
        [0, 230, 0],
        [0, 225, 0],
        [0, 220, 0],
        [0, 215, 0],
        [0, 210, 0],
        [0, 205, 0],
        [0, 200, 0],
        [0, 195, 0],
        [0, 190, 0],
        [30, 195, 0],
        [35, 200, 0],
        [40, 205, 0],
        [50, 210, 0],
        [70, 215, 0],
        [90, 220, 0],
        [118, 225, 0],
        [137, 230, 0],
        [156, 234, 0],
        [174, 238, 0],
        [191, 241, 0],
        [207, 245, 0],
        [221, 248, 0],
        [233, 250, 0],
        [242, 252, 0],
        [249, 254, 0],
        [254, 254, 0],
        [255, 252, 0],
        [255, 249, 0],
        [255, 244, 0],
        [255, 238, 0],
        [255, 231, 0],
        [255, 223, 0],
        [255, 215, 0],
        [255, 206, 0],
        [255, 196, 0],
        [255, 187, 0],
        [255, 177, 0],
        [255, 168, 0],
        [255, 160, 0],
        [255, 152, 0],
        [255, 145, 0],
        [255, 139, 0],
        [255, 134, 0],
        [255, 131, 0],
        [255, 128, 0],
        [255, 127, 0],
        [255, 125, 0],
        [255, 122, 0],
        [255, 117, 0],
        [255, 111, 0],
        [255, 104, 0],
        [255, 96, 0],
        [255, 87, 0],
        [255, 78, 0],
        [255, 69, 0],
        [255, 59, 0],
        [255, 50, 0],
        [255, 41, 0],
        [255, 32, 0],
        [255, 24, 0],
        [255, 17, 0],
        [255, 11, 0],
        [255, 6, 0],
        [255, 3, 0],
        [255, 0, 0],
        [255, 255, 255]];

    /* src\App.svelte generated by Svelte v3.46.4 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let p0;
    	let t7;
    	let p1;
    	let t17;
    	let img;
    	let img_src_value;
    	let t18;
    	let p2;
    	let t26;
    	let p3;
    	let t30;
    	let p4;
    	let t31_value = "image data length: " + "";
    	let t31;
    	let t32;
    	let t33;
    	let t34;
    	let canvas_1;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text("Hello - ");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = text("!");
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = `Add two numbers produces ${/*two*/ ctx[3]} as sum of 11 plus 22.`;
    			t7 = space();
    			p1 = element("p");
    			p1.textContent = `${/*map2*/ ctx[6][5]}  ${"  *****  "}  ${colormap[2]}  ${" ** "}  ${colormap[2][3]}`;
    			t17 = space();
    			img = element("img");
    			t18 = space();
    			p2 = element("p");
    			p2.textContent = `${"map2 Dimensions: "}  ${/*gridsize*/ ctx[5]}  ${" by "}  ${/*gridsize*/ ctx[5]}`;
    			t26 = space();
    			p3 = element("p");
    			p3.textContent = `${"map2.flattend Dimensions: "}  ${/*map2*/ ctx[6].length}`;
    			t30 = space();
    			p4 = element("p");
    			t31 = text(t31_value);
    			t32 = space();
    			t33 = text(/*idatal*/ ctx[1]);
    			t34 = space();
    			canvas_1 = element("canvas");
    			attr_dev(h1, "class", "svelte-1ck14rg");
    			add_location(h1, file, 26, 1, 889);
    			add_location(p0, file, 27, 1, 915);
    			add_location(p1, file, 28, 1, 976);
    			if (!src_url_equal(img.src, img_src_value = /*src*/ ctx[4])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-1ck14rg");
    			add_location(img, file, 30, 1, 1049);
    			add_location(p2, file, 31, 1, 1071);
    			add_location(p3, file, 32, 1, 1132);
    			add_location(p4, file, 33, 1, 1185);
    			attr_dev(canvas_1, "width", "310");
    			attr_dev(canvas_1, "height", "310");
    			attr_dev(canvas_1, "class", "svelte-1ck14rg");
    			add_location(canvas_1, file, 34, 1, 1226);
    			attr_dev(main, "class", "svelte-1ck14rg");
    			add_location(main, file, 25, 0, 881);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			append_dev(main, t3);
    			append_dev(main, p0);
    			append_dev(main, t7);
    			append_dev(main, p1);
    			append_dev(main, t17);
    			append_dev(main, img);
    			append_dev(main, t18);
    			append_dev(main, p2);
    			append_dev(main, t26);
    			append_dev(main, p3);
    			append_dev(main, t30);
    			append_dev(main, p4);
    			append_dev(p4, t31);
    			append_dev(p4, t32);
    			append_dev(p4, t33);
    			append_dev(main, t34);
    			append_dev(main, canvas_1);
    			/*canvas_1_binding*/ ctx[7](canvas_1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);
    			if (dirty & /*idatal*/ 2) set_data_dev(t33, /*idatal*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*canvas_1_binding*/ ctx[7](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let two = addTwoNums(11, 22);
    	let { name } = $$props;
    	let src = 'images/narrow.png';
    	let gridsize = 301;
    	let map2 = getflatarray(gridsize);
    	let idatal = 0;
    	let canvas;

    	onMount(() => {
    		const bwidth = 3;
    		const ctx = canvas.getContext('2d');
    		var imageData = ctx.getImageData(bwidth, bwidth, gridsize, gridsize);
    		$$invalidate(1, idatal = imageData.data.length);

    		for (let p = 0; p < imageData.data.length; p += 4) {
    			imageData.data[p + 0] = colormap[map2[p / 4]][0];
    			imageData.data[p + 1] = colormap[map2[p / 4]][1];
    			imageData.data[p + 2] = colormap[map2[p / 4]][2];
    			imageData.data[p + 3] = 255;
    		}

    		ctx.putImageData(imageData, bwidth, bwidth);
    	});

    	const writable_props = ['name'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			canvas = $$value;
    			$$invalidate(2, canvas);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({
    		addTwoNums,
    		getarray,
    		getflatarray,
    		testmap,
    		colormap,
    		two,
    		name,
    		src,
    		gridsize,
    		map2,
    		idatal,
    		onMount,
    		canvas
    	});

    	$$self.$inject_state = $$props => {
    		if ('two' in $$props) $$invalidate(3, two = $$props.two);
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('src' in $$props) $$invalidate(4, src = $$props.src);
    		if ('gridsize' in $$props) $$invalidate(5, gridsize = $$props.gridsize);
    		if ('map2' in $$props) $$invalidate(6, map2 = $$props.map2);
    		if ('idatal' in $$props) $$invalidate(1, idatal = $$props.idatal);
    		if ('canvas' in $$props) $$invalidate(2, canvas = $$props.canvas);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, idatal, canvas, two, src, gridsize, map2, canvas_1_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !('name' in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'is it Working?'
        }
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
