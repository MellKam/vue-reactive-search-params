import {
	customRef,
	nextTick,
	shallowRef,
	triggerRef,
	watch,
	onScopeDispose,
	toRaw,
	getCurrentScope,
} from "vue";
import type { Ref } from "vue";

const isClient = typeof window !== "undefined";

export const _internal = {
	searchParams: shallowRef(
		new URLSearchParams(isClient ? window.location.search : "")
	),
	isListeningPopsate: false,
};

const listenPopstate = () => {
	if (!isClient || _internal.isListeningPopsate) return;
	_internal.isListeningPopsate = true;

	const onPopstate = () => {
		_internal.searchParams.value = new URLSearchParams(window.location.search);
	};
	window.addEventListener("popstate", onPopstate);

	const scope = getCurrentScope();
	if (scope) {
		onScopeDispose(() => {
			window.removeEventListener("popstate", onPopstate);
			_internal.isListeningPopsate = false;
		});
	}
};

export const defaultNavigate = (searchParams: URLSearchParams): void => {
	const url = new URL(window.location.href);
	url.search = searchParams.toString();
	window.history.replaceState(window.history.state, "", url);
};

export interface UseSearchParamOptions<T = string | null> {
	/**
	 * Function that is responsible for updating the URL with new search params.
	 * Will be called only on client side when the value of returned ref changes.
	 *
	 * @default
	 * By default it will replace the current history state with new constructed URL.
	 * ```ts
	 * {
	 *   navigate: (searchParams: URLSearchParams) => {
	 *     const url = new URL(window.location.href);
	 *     url.search = searchParams.toString();
	 *     window.history.replaceState(window.history.state, "", url);
	 *   }
	 * }
	 * ```
	 * If you want to push new history state, you can change `replaceState` to `pushState`.
	 *
	 * @example
	 * Example with storing search params in `hash` instead of `search`:
	 * ```ts
	 * const foo = useSearchParam("foo", {
	 *   navigate: (searchParams) => {
	 *     const url = new URL(window.location.href);
	 *     url.hash = searchParams.toString();
	 *     window.history.replaceState(window.history.state, "", url);
	 *   }
	 * })
	 *
	 * foo.value = "bar"; // /your/route#foo=bar
	 * ```
	 */
	navigate?: (searchParams: URLSearchParams) => void;
	/**
	 * Functions that can be used to convert the search param value to and from the desired type.
	 *
	 * @default
	 * ```ts
	 * {
	 *   read: (value: string | null) => value as T,
	 *   write: (value: T) => value as string | null,
	 * }
	 * ```
	 *
	 *
	 * @example
	 * Example storing json object in search param
	 * ```ts
	 * const user = useSearchParam<{ name: string; age: number } | null>("count", {
	 *   serializer: {
	 *     read: (value) => (value ? JSON.parse(value) : null),
	 *     write: (value) => (value ? JSON.stringify(value) : null),
	 *   },
	 * });
	 *
	 * user.value = { name: "John", age: 25 };
	 * // ?user=%7B%22name%22%3A%22John%22%2C%22age%22%3A25%7D
	 * ```
	 *
	 * Because `URLSearchParams` automatically encodes the value to be a valid URL component, you don't need to mess with `encodeURIComponent`
	 */
	serializer?: {
		read: (value: string | null) => T;
		write: (value: T) => string | null;
	};
}

/**
 * ### Reactive search param
 *
 * Creates a reactive ref that will update the search param with the given name when the value changes.
 * Automatically listens to `popstate` event and updates the search params.
 *
 * @template T - The value type
 *
 * @example
 * Basic string search param
 * ```ts
 * const search = useSearchParam("search");
 *
 * search.value = "hello"; // ?search=hello
 * ```
 *
 * @example
 * Reactive integer search param
 * ```ts
 * const count = useSearchParam("count", {
 *   serializer: {
 *     read: (value) => (value ? parseInt(value) : 0),
 *     write: (value) => value.toString(),
 *   }
 * });
 *
 * count.value++; // ?count=1
 * count.value = 5; // ?count=5
 * ```
 */
export function useSearchParam<T = string | null>(
	name: string,
	options: UseSearchParamOptions<T> = {}
): Ref<T> {
	const {
		navigate = defaultNavigate,
		serializer = {
			read: (value: string | null) => value as T,
			write: (value: T) => value as string | null,
		},
	} = options;

	let writableValue = _internal.searchParams.value.get(name);
	let readableValue = serializer.read(writableValue);
	let _trigger: () => void | undefined;

	if (isClient) {
		watch(
			_internal.searchParams,
			() => {
				const newWritableValue = _internal.searchParams.value.get(name);
				if (newWritableValue === writableValue) return;

				readableValue = serializer.read(newWritableValue);
				writableValue = newWritableValue;
				_trigger();
			},
			{ flush: "sync" }
		);
	}

	listenPopstate();

	return customRef<T>((track, trigger) => {
		_trigger = trigger;
		return {
			get() {
				track();
				return readableValue;
			},
			set(newReadableValue) {
				const newWritableValue = serializer.write(newReadableValue);
				if (newWritableValue === writableValue) return;

				readableValue = newReadableValue;
				writableValue = newWritableValue;
				if (typeof newWritableValue === "string") {
					_internal.searchParams.value.set(name, newWritableValue);
				} else {
					_internal.searchParams.value.delete(name);
				}
				_trigger();
				triggerRef(_internal.searchParams);

				if (isClient) {
					nextTick(() => navigate(toRaw(_internal.searchParams.value)));
				}
			},
		};
	});
}

const isEqualArrays = <T>(a: T[], b: T[]): boolean => {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
};

export interface UseSearchParamArrayOptions<T = string> {
	/**
	 * Function that is responsible for updating the URL with new search params.
	 * Will be called only on client side when the value of returned ref changes.
	 *
	 * @default
	 * By default it will replace the current history state with new constructed URL.
	 * ```ts
	 * {
	 *   navigate: (searchParams: URLSearchParams) => {
	 *     const url = new URL(window.location.href);
	 *     url.search = searchParams.toString();
	 *     window.history.replaceState(window.history.state, "", url);
	 *   }
	 * }
	 * ```
	 */
	navigate?: (searchParams: URLSearchParams) => void;
	/**
	 * Functions that can be used to convert the search param value to and from the desired type.
	 *
	 * @default
	 * ```ts
	 * {
	 *   read: (value: string) => value as T,
	 *   write: (value: T) => value as string,
	 * }
	 * ```
	 */
	serializer?: {
		read: (value: string) => T;
		write: (value: T) => string;
	};
}

/**
 * ### Reactive Search Parameter Array
 *
 * Creates a reactive ref that updates the search parameter with the given name when the value changes.
 * Automatically listens to the `popstate` event and updates the search parameters.
 *
 * @template T - The array item type
 *
 * @example
 * Basic string array example
 * ```ts
 * const fruits = useSearchParamArray("fruits");
 *
 * fruits.value.push("orange"); // ?fruits=orange
 * fruits.value.push("apple"); // ?fruits=orange&fruits=apple
 * fruits.value.push("banana"); // ?fruits=orange&fruits=apple&fruits=banana
 * ```
 *
 * @example
 * Reactive integer array example
 * ```ts
 * const numbers = useSearchParamArray("numbers", {
 *   serializer: {
 *     read: (value) => parseInt(value),
 *     write: (value) => value.toString(),
 *   },
 * });
 *
 * numbers.value.push(1); // ?numbers=1
 * numbers.value.push(2); // ?numbers=1&numbers=2
 * numbers.value.push(3); // ?numbers=1&numbers=2&numbers=3
 * ```
 */
export function useSearchParamArray<T = string>(
	name: string,
	options: UseSearchParamArrayOptions<T> = {}
): Ref<T[]> {
	const {
		navigate = defaultNavigate,
		serializer = {
			read: (value: string) => value as T,
			write: (value: T) => value as string,
		},
	} = options;

	let writableValue = _internal.searchParams.value.getAll(name);
	let readableValue = writableValue.map(serializer.read);
	let _trigger = () => {};

	if (isClient) {
		watch(
			_internal.searchParams,
			() => {
				const newWritableValue = _internal.searchParams.value.getAll(name);
				if (isEqualArrays(newWritableValue, writableValue)) return;

				readableValue = newWritableValue.map(serializer.read);
				writableValue = newWritableValue;
				_trigger();
			},
			{ flush: "sync" }
		);
	}

	listenPopstate();

	return customRef<T[]>((track, trigger) => {
		_trigger = trigger;
		return {
			get() {
				track();
				return readableValue;
			},
			set(newReadableValue) {
				const newWritableValue = newReadableValue.map(serializer.write);
				if (isEqualArrays(newWritableValue, writableValue)) return;

				readableValue = newReadableValue;
				writableValue = newWritableValue;
				_internal.searchParams.value.delete(name);
				for (const value of newWritableValue) {
					_internal.searchParams.value.append(name, value);
				}
				_trigger();
				triggerRef(_internal.searchParams);

				if (isClient) {
					nextTick(() => navigate(toRaw(_internal.searchParams.value)));
				}
			},
		};
	});
}
