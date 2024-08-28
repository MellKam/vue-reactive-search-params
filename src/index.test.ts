import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { JSDOM } from "jsdom";
import { nextTick, watch } from "vue";

describe("useSearchParam", () => {
	let jsdom: JSDOM;

	beforeEach(() => {
		jsdom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`, {
			url: "http://localhost:3000/",
		});
		global.window = jsdom.window as unknown as Window & typeof globalThis;
	});

	afterEach(() => {
		jsdom.window.close();
	});

	it("should initialize with the correct value", async () => {
		const url = new URL(window.location.href);
		url.searchParams.set("foo", "bar");
		jsdom.reconfigure({ url: url.href });

		const { useSearchParam, _internal } = await import("./index");
		_internal.searchParams.value = new URLSearchParams(window.location.search);

		const foo = useSearchParam("foo");
		expect(foo.value).toBe("bar");
	});

	it("should update the URL when the value changes", async () => {
		const { useSearchParam, _internal } = await import("./index");
		_internal.searchParams.value = new URLSearchParams(window.location.search);

		const baz = useSearchParam("baz");
		baz.value = "bar";
		await nextTick();
		expect(window.location.search).toBe("?baz=bar");
		expect(baz.value).toBe("bar");
	});

	it("should handle custom serialization", async () => {
		const { useSearchParam, _internal } = await import("./index");
		_internal.searchParams.value = new URLSearchParams(window.location.search);

		const count = useSearchParam("count", {
			serializer: {
				read: (value) => (value ? parseInt(value) : 0),
				write: (value) => value.toString(),
			},
		});
		count.value = 42;
		await nextTick();
		expect(window.location.search).toBe("?count=42");
		expect(count.value).toBe(42);
	});

	it("should remove the search param when set to null", async () => {
		const { useSearchParam, _internal } = await import("./index");
		_internal.searchParams.value = new URLSearchParams(window.location.search);

		const foo = useSearchParam("foo");
		foo.value = "baz";
		await nextTick();
		expect(window.location.search).toBe("?foo=baz");

		foo.value = null;
		await nextTick();
		expect(window.location.search).toBe("");
	});

	it("should not delete param if value is empty string", async () => {
		const { useSearchParam, _internal } = await import("./index");
		_internal.searchParams.value = new URLSearchParams(window.location.search);

		const foo = useSearchParam("foo");
		foo.value = "";
		await nextTick();
		expect(window.location.search).toBe("?foo=");
		expect(foo.value).toBe("");
	});

	it("should react to popstate events", async () => {
		const { useSearchParam, _internal } = await import("./index");
		_internal.searchParams.value = new URLSearchParams(window.location.search);
		_internal.isListeningPopsate = false;

		const foo = useSearchParam("foo");

		const url = new URL(window.location.href);
		url.searchParams.set("foo", "bar");
		jsdom.reconfigure({ url: url.href });
		window.dispatchEvent(new jsdom.window.PopStateEvent("popstate"));

		await nextTick();
		expect(foo.value).toBe("bar");
	});

	it("should property handle multiple refs with same param name", async () => {
		const { useSearchParam, _internal } = await import("./index");
		_internal.searchParams.value = new URLSearchParams(window.location.search);

		const foo = useSearchParam("foo");
		const bar = useSearchParam("foo");

		foo.value = "baz";
		await nextTick();
		expect(window.location.search).toBe("?foo=baz");
		expect(bar.value).toBe("baz");

		bar.value = "qux";
		await nextTick();
		expect(window.location.search).toBe("?foo=qux");
		expect(foo.value).toBe("qux");
	});

	it("should not trigger ref when other search param changes", async () => {
		const { useSearchParam, _internal } = await import("./index");
		_internal.searchParams.value = new URLSearchParams(window.location.search);

		const foo = useSearchParam("foo");
		const bar = useSearchParam("bar");

		const stopWatchFoo = watch(foo, () => {
			expect(foo.value).toBe("baz");
		});
		const stopWatchBar = watch(bar, () => {
			throw new Error("bar should not trigger");
		});

		foo.value = "baz";
		await nextTick();

		stopWatchFoo();
		stopWatchBar();
	});
});

describe("useSearchParamArray", () => {
	let jsdom: JSDOM;

	beforeEach(() => {
		jsdom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`, {
			url: "http://localhost:3000/",
		});
		global.window = jsdom.window as unknown as Window & typeof globalThis;
	});

	afterEach(() => {
		jsdom.window.close();
	});

	it("should initialize with the correct value", async () => {
		const url = new URL(window.location.href);
		url.searchParams.set("foo", "bar");
		url.searchParams.append("foo", "baz");
		jsdom.reconfigure({ url: url.href });

		const { useSearchParamArray, _internal } = await import("./index");
		_internal.searchParams.value = new URLSearchParams(window.location.search);

		const foo = useSearchParamArray("foo");
		expect(foo.value).toEqual(["bar", "baz"]);
	});

	it("should update the URL when the value changes", async () => {
		const { useSearchParamArray, _internal } = await import("./index");
		_internal.searchParams.value = new URLSearchParams(window.location.search);

		const foo = useSearchParamArray("foo");
		foo.value = ["bar", "baz"];
		await nextTick();
		expect(window.location.search).toBe("?foo=bar&foo=baz");
		expect(foo.value).toEqual(["bar", "baz"]);
	});

	it("should handle custom serialization", async () => {
		const { useSearchParamArray, _internal } = await import("./index");
		_internal.searchParams.value = new URLSearchParams(window.location.search);

		const count = useSearchParamArray("count", {
			serializer: {
				read: (value) => parseInt(value),
				write: (value) => value.toString(),
			},
		});
		count.value = [42, 72];
		await nextTick();
		expect(window.location.search).toBe("?count=42&count=72");
		expect(count.value).toEqual([42, 72]);
	});

	it("should remove the search param when set to empty array", async () => {
		const { useSearchParamArray, _internal } = await import("./index");
		_internal.searchParams.value = new URLSearchParams(window.location.search);

		const foo = useSearchParamArray("foo");
		foo.value = ["baz"];
		await nextTick();
		expect(window.location.search).toBe("?foo=baz");

		foo.value = [];
		await nextTick();
		expect(window.location.search).toBe("");
	});

	it("should not trigger ref when other search param changes", async () => {
		const { useSearchParamArray, _internal } = await import("./index");
		_internal.searchParams.value = new URLSearchParams(window.location.search);

		const foo = useSearchParamArray("foo");
		const bar = useSearchParamArray("bar");

		const stopWatchFoo = watch(foo, () => {
			expect(foo.value).toEqual(["baz"]);
		});
		const stopWatchBar = watch(bar, () => {
			throw new Error("bar should not trigger");
		});

		foo.value = ["baz"];
		await nextTick();

		stopWatchFoo();
		stopWatchBar();
	});
});
