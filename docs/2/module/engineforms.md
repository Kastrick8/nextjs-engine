# EngineForms (EF)

> **GENERATION 2 · STABLE 2.x** · Source branch: `main-2`. This reference describes the 2.x line.



Schema types: `"form"`, `"input"`, `"textarea"`, `"checkbox"`, and `"label"`.

EngineForms are native form elements with engine styling and named-handler
resolution. **Field binding is currently driven by `name`, not by
`cprop.bind`.**

## Submit flow

```text
input/textarea/checkbox props.name
        ↓
data-engine-bind="name"
        ↓
EngineForm collects bound values on submit
        ↓
named createPage handler receives (values, submitEvent)
        ↓
your handler may pass values to EngineAPIResolver
```

EngineAPIResolver does not walk the form DOM itself.

## Form

```ts
{
  type: "form",
  props: {
    onSubmit: "handleLogin",
    noValidate: false,
  },
  children: [/* fields */],
}
```

| Prop | Type | Notes |
|---|---|---|
| `onSubmit` | `string` | Named handler from `createPage({ handlers })` |
| `onReset` | `string` | Named reset handler |
| `method` | `"get" \| "post"` | Native form method |
| `action` | `string` | Native action URL |
| `noValidate` | `boolean` | Native validation control |
| `autoComplete` | `string` | Native autocomplete |
| `encType` | `string` | Native encoding type |

When a named submit handler exists and no native `action` is supplied,
EngineForm prevents the browser's default navigation and calls:

```ts
handler(values, event)
```

If an `action` is present, the named handler may still observe the submission,
but EngineForm does not automatically cancel the native action.

## Input / Textarea

`name` is both the native form field name and EngineForms binding key.

```ts
{
  type: "input",
  props: {
    id: "email",
    name: "email",
    type: "email",
    required: true,
    onChange: "emailChanged",
  },
}
```

A named `onChange` handler receives:

```ts
handler(currentValue, changeEvent)
```

File inputs contribute a `File` for a single selection or `File[]` when
`multiple` is enabled. Disabled fields are skipped.


### Input props

| Prop | Type | Notes |
|---|---|---|
| `type` | `InputType` | Defaults to `"text"`. Supports text, email, password, search, URL, telephone, number, hidden, date, time, color, range, file, checkbox, radio, submit, reset and button. |
| `name` | `string` | Native field name and form-collection key. |
| `value` / `defaultValue` | `string \| number` | Controlled value or initial value. |
| `placeholder` | `string` | Native placeholder. |
| `disabled` / `required` / `readOnly` | `boolean` | Native field state and validation behavior. |
| `pattern` | `string` | Native validation pattern. |
| `min` / `max` / `step` | `string \| number` | Native numeric/date constraints. |
| `minLength` / `maxLength` | `number` | Text-length constraints. |
| `multiple` / `accept` | `boolean` / `string` | File-selection behavior and accepted file types. |
| `autoComplete` | `string` | Native autocomplete hint. |
| `ariaLabel` / `ariaDescribedBy` | `string` | Applied as `aria-label` / `aria-describedby`. |
| `autoFocus` / `tabIndex` | `boolean` / `number` | Native focus behavior. |
| `onChange` | `string` | Named handler receiving the current value and React change event. |

The exported `InputType` union is shared by the schema input and
`EngineInputProps`. File fields contribute a `File` for one selection or
`File[]` when `multiple` is enabled. The dedicated `checkbox` schema node
also supports an explicit checked/defaultChecked contract.

### Textarea props

| Prop | Type | Notes |
|---|---|---|
| `name` | `string` | Native field name and collection key. |
| `value` / `defaultValue` | `string` | Controlled value or initial value. |
| `placeholder` | `string` | Native placeholder. |
| `rows` / `cols` | `number` | Native text-area dimensions. |
| `minLength` / `maxLength` | `number` | Text-length constraints. |
| `disabled` / `required` / `readOnly` | `boolean` | Native field state and validation behavior. |
| `autoComplete` | `string` | Native autocomplete hint. |
| `ariaLabel` / `ariaDescribedBy` | `string` | Accessible name and description references. |
| `autoFocus` / `tabIndex` | `boolean` / `number` | Native focus behavior. |
| `onChange` | `string` | Named handler receiving the current string value and React change event. |
| `resizable` | `"none" \| "both" \| "horizontal" \| "vertical" \| "block" \| "inline"` | Controls the CSS resize behavior. |

## Checkbox values## Checkbox values

Checkbox binding currently produces:

- checked → the checkbox `value`, or `"on"` when no value was supplied;
- unchecked → `"off"`.

Repeated fields with the same binding name are accumulated into an array.


### Checkbox props

| Prop | Type | Notes |
|---|---|---|
| `name` | `string` | Native field name and collection key. |
| `value` | `string` | Value included when checked; defaults to the browser's `"on"` value when omitted. |
| `checked` / `defaultChecked` | `boolean` | Controlled state or initial checked state. |
| `disabled` / `required` | `boolean` | Native field state and validation behavior. |
| `ariaLabel` / `ariaDescribedBy` | `string` | Accessible name and description references. |
| `onChange` | `string` | Named handler receiving `"on"`/the supplied value when checked, or `"off"` when unchecked, plus the React change event. |
| `autoFocus` / `tabIndex` | `boolean` / `number` | Native focus behavior. |

## Label## Label

```ts
{ type: "label", props: { forInput: "email", children: "Email" } }
```

`forInput: "email"` maps to `htmlFor="for-email"`. Use a matching input id:

```ts
{ type: "input", props: { id: "for-email", name: "email" } }
```

You may use `htmlFor` directly instead.

The exported `EngineLabelProps` contract also supports `children`,
`htmlFor`, and `forInput`. `htmlFor` is passed through unchanged;
`forInput: "email"` resolves to `htmlFor="for-email"`. Use the exact matching
input id so the browser label association works.


## EngineAPI example

```ts
export default createPage({
  schema: LoginSchema,
  handlers: {
    async handleLogin(values: Record<string, unknown>) {
      const resolver = new EngineAPIResolver({
        endpoint: "https://api.example.com/login",
        method: "POST",
      });

      const response = await resolver.resolveRequest({ formData: values });
      // handle response
    },
  },
});
```

For binary values EngineAPIResolver creates native `FormData` and lets `fetch`
set the multipart boundary. For non-binary object values it sends JSON by
default.

## Current binding API

Do not rely on old docs/examples that say `cprop.bind` automatically talks to
EngineAPIResolver. In the current API:

1. set `name` on the field;
2. set `onSubmit` on the EngineForm to a named page handler;
3. receive the collected object in that handler;
4. pass it to EngineAPIResolver if the form is network-backed.

This keeps form collection and network orchestration separate and explicit.


The primitives are also exported for direct React use as `EngineForm`,
`EngineInput`, `EngineTextarea`, `EngineCheckbox`, and `EngineLabel`.
Their `onSubmit`, `onReset`, and `onChange` props resolve named Engine
handlers; they are not ordinary React callback props. Use a regular HTML
`<form>` when you want to own submission with a native React
`onSubmit={(event) => ...}` callback.
