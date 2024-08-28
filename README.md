# Reactive search params for vue

```ts
const search = useSearchParam("search");

search.value = "hello"; // ?search=hello
```

```ts
const count = useSearchParam("count", {
	serializer: {
		read: (value) => (value ? parseInt(value) : 0),
		write: (value) => value.toString(),
	},
});

count.value++; // ?count=1
count.value = 5; // ?count=5
```

```ts
const user = useSearchParam<{ name: string; age: number } | null>("count", {
	serializer: {
		read: (value) => (value ? JSON.parse(value) : null),
		write: (value) => (value ? JSON.stringify(value) : null),
	},
});

user.value = { name: "John", age: 25 };
// ?user=%7B%22name%22%3A%22John%22%2C%22age%22%3A25%7D
```

```ts
const fruits = useSearchParamArray("fruits");

fruits.value.push("orange"); // ?fruits=orange
fruits.value.push("apple"); // ?fruits=orange&fruits=apple
fruits.value.push("banana"); // ?fruits=orange&fruits=apple&fruits=banana
```

```ts
const numbers = useSearchParamArray("numbers", {
	serializer: {
		read: (value) => parseInt(value),
		write: (value) => value.toString(),
	},
});

numbers.value.push(1); // ?numbers=1
numbers.value.push(2); // ?numbers=1&numbers=2
numbers.value.push(3); // ?numbers=1&numbers=2&numbers=3
```
