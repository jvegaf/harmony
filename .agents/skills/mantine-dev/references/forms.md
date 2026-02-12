# Forms Reference

`@mantine/form` provides `useForm` hook for managing form state, validation, and submission.

## Installation

```bash
npm install @mantine/form
```

No styles needed — works with or without `@mantine/core`.

## Basic Usage

```tsx
import { useForm } from '@mantine/form';
import { TextInput, Button, Box } from '@mantine/core';

interface FormValues {
  email: string;
  name: string;
}

function Demo() {
  const form = useForm<FormValues>({
    mode: 'uncontrolled', // Recommended for performance
    initialValues: {
      email: '',
      name: '',
    },
    validate: {
      email: value => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      name: value => (value.length < 2 ? 'Name too short' : null),
    },
  });

  return (
    <Box
      component='form'
      onSubmit={form.onSubmit(values => console.log(values))}
    >
      <TextInput
        label='Name'
        placeholder='Your name'
        key={form.key('name')}
        {...form.getInputProps('name')}
      />
      <TextInput
        label='Email'
        placeholder='your@email.com'
        key={form.key('email')}
        {...form.getInputProps('email')}
      />
      <Button
        type='submit'
        mt='md'
      >
        Submit
      </Button>
    </Box>
  );
}
```

## useForm Options

```tsx
interface UseFormInput<Values> {
  mode?: 'controlled' | 'uncontrolled'; // Default: 'controlled'
  initialValues?: Values;
  initialErrors?: FormErrors;
  initialDirty?: Record<string, boolean>;
  initialTouched?: Record<string, boolean>;
  validate?: FormValidation<Values>;
  validateInputOnChange?: boolean | string[];
  validateInputOnBlur?: boolean | string[];
  clearInputErrorOnChange?: boolean;
  onValuesChange?: (values: Values, previous: Values) => void;
  onSubmitPreventDefault?: 'always' | 'never' | 'validation-failed';
}
```

## Controlled vs Uncontrolled Mode

### Uncontrolled (Recommended)

Better performance — values stored in DOM:

```tsx
const form = useForm({
  mode: 'uncontrolled', // Add mode
  initialValues: { name: '' },
});

<TextInput
  key={form.key('name')} // Required for uncontrolled
  {...form.getInputProps('name')}
/>;
```

### Controlled

Values stored in React state — re-renders on every change:

```tsx
const form = useForm({
  mode: 'controlled',
  initialValues: { name: '' },
});

<TextInput {...form.getInputProps('name')} />;
```

## Form Values

```tsx
// Get all values
const values = form.getValues();

// Set single field
form.setFieldValue('email', 'new@email.com');

// Set multiple values
form.setValues({ name: 'John', email: 'john@email.com' });

// Set values from previous state
form.setValues(prev => ({ ...prev, name: 'Updated' }));

// Reset to initialValues
form.reset();

// Reset single field
form.resetField('email');

// Update initialValues (affects reset)
form.setInitialValues({ name: 'New Initial' });
```

## Validation

### Inline Rules

```tsx
const form = useForm({
  mode: 'uncontrolled',
  initialValues: {
    email: '',
    age: 0,
    password: '',
    confirmPassword: '',
  },
  validate: {
    email: value => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    age: value => (value < 18 ? 'Must be 18+' : null),
    // Access all values for cross-field validation
    confirmPassword: (value, values) => (value !== values.password ? 'Passwords do not match' : null),
  },
});
```

### Function-based Validation

```tsx
const form = useForm({
  mode: 'uncontrolled',
  initialValues: { name: '', email: '' },
  validate: values => ({
    name: values.name.length < 2 ? 'Name too short' : null,
    email: !values.email.includes('@') ? 'Invalid email' : null,
  }),
});
```

### Schema Validation (Zod, Yup, Joi)

```tsx
import { zodResolver } from 'mantine-form-zod-resolver';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name must have at least 2 characters'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18 or older'),
});

const form = useForm({
  mode: 'uncontrolled',
  initialValues: { name: '', email: '', age: 0 },
  validate: zodResolver(schema),
});
```

Install resolver:

```bash
npm install mantine-form-zod-resolver zod
# or
npm install mantine-form-yup-resolver yup
# or
npm install mantine-form-joi-resolver joi
```

### Validation Timing

```tsx
const form = useForm({
  mode: 'uncontrolled',
  validateInputOnChange: true, // Validate all on change
  validateInputOnBlur: true, // Validate all on blur
  clearInputErrorOnChange: true, // Clear error when value changes (default)
});

// Validate specific fields only
const form = useForm({
  mode: 'uncontrolled',
  validateInputOnChange: ['email', 'password'],
  validateInputOnBlur: ['email'],
});
```

### Manual Validation

```tsx
// Validate all fields
const result = form.validate();
// result.hasErrors: boolean
// result.errors: FormErrors

// Validate single field
form.validateField('email');

// Check if valid (without setting errors)
const isValid = form.isValid();
const isEmailValid = form.isValid('email');
```

## Errors

```tsx
// Get current errors
form.errors; // { email: 'Invalid', name: null }

// Set error
form.setFieldError('email', 'This email is taken');

// Set multiple errors
form.setErrors({ email: 'Invalid', name: 'Required' });

// Clear all errors
form.clearErrors();

// Clear single field error
form.clearFieldError('email');
```

## Form Submission

```tsx
<form
  onSubmit={form.onSubmit(
    // Success handler - called when validation passes
    (values, event) => {
      console.log('Valid:', values);
      // Submit to API
    },
    // Error handler - called when validation fails
    (errors, values, event) => {
      console.log('Errors:', errors);
      // Show notification, focus first error, etc.
    },
  )}
>
  {/* inputs */}
</form>
```

## Nested Objects

```tsx
const form = useForm({
  mode: 'uncontrolled',
  initialValues: {
    user: {
      firstName: '',
      lastName: '',
      address: {
        city: '',
        country: '',
      },
    },
  },
  validate: {
    user: {
      firstName: (value) => (value.length < 2 ? 'Too short' : null),
      address: {
        city: (value) => (!value ? 'Required' : null),
      },
    },
  },
});

<TextInput
  key={form.key('user.firstName')}
  {...form.getInputProps('user.firstName')}
/>
<TextInput
  key={form.key('user.address.city')}
  {...form.getInputProps('user.address.city')}
/>
```

## List Fields

```tsx
const form = useForm({
  mode: 'uncontrolled',
  initialValues: {
    employees: [{ name: '', email: '' }],
  },
});

// Add item
form.insertListItem('employees', { name: '', email: '' });

// Add at specific index
form.insertListItem('employees', { name: '', email: '' }, 0);

// Remove item
form.removeListItem('employees', 1);

// Replace item
form.replaceListItem('employees', 0, { name: 'New', email: 'new@email.com' });

// Reorder items
form.reorderListItem('employees', { from: 0, to: 2 });
```

### Rendering List

```tsx
import { FORM_INDEX } from '@mantine/form';

function Demo() {
  const fields = form.getValues().employees.map((item, index) => (
    <Group key={item.key}>
      <TextInput
        key={form.key(`employees.${index}.name`)}
        {...form.getInputProps(`employees.${index}.name`)}
      />
      <TextInput
        key={form.key(`employees.${index}.email`)}
        {...form.getInputProps(`employees.${index}.email`)}
      />
      <ActionIcon onClick={() => form.removeListItem('employees', index)}>
        <IconTrash />
      </ActionIcon>
    </Group>
  ));

  return (
    <Box>
      {fields}
      <Button onClick={() => form.insertListItem('employees', { name: '', email: '' })}>Add Employee</Button>
    </Box>
  );
}

// Validation for list items with FORM_INDEX
const form = useForm({
  mode: 'uncontrolled',
  validateInputOnChange: [`employees.${FORM_INDEX}.name`],
});
```

## Touched & Dirty State

```tsx
// Check if any field was interacted with
form.isTouched();
form.isTouched('email');

// Check if values differ from initialValues
form.isDirty();
form.isDirty('email');

// Set touched state
form.setTouched({ email: true, name: false });
form.resetTouched();

// Set dirty state
form.setDirty({ email: true });
form.resetDirty(); // Snapshot current values as "clean"
```

## Form Context

Share form across components without prop drilling:

```tsx
// formContext.ts
import { createFormContext } from '@mantine/form';

interface FormValues {
  name: string;
  email: string;
}

export const [FormProvider, useFormContext, useForm] = createFormContext<FormValues>();
```

```tsx
// Parent component
import { FormProvider, useForm } from './formContext';

function Parent() {
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { name: '', email: '' },
  });

  return (
    <FormProvider form={form}>
      <NameInput />
      <EmailInput />
    </FormProvider>
  );
}

// Child component
import { useFormContext } from './formContext';

function NameInput() {
  const form = useFormContext();
  return (
    <TextInput
      key={form.key('name')}
      {...form.getInputProps('name')}
    />
  );
}
```

## UseFormReturnType

Type for passing form as prop:

```tsx
import { UseFormReturnType } from '@mantine/form';

interface Props {
  form: UseFormReturnType<{ name: string; email: string }>;
}

function NameField({ form }: Props) {
  return (
    <TextInput
      key={form.key('name')}
      {...form.getInputProps('name')}
    />
  );
}
```

## Built-in Validators

```tsx
import { isNotEmpty, isEmail, hasLength, matches, isInRange } from '@mantine/form';

const form = useForm({
  mode: 'uncontrolled',
  initialValues: {
    name: '',
    email: '',
    age: 0,
    website: '',
    terms: false,
  },
  validate: {
    name: isNotEmpty('Name is required'),
    email: isEmail('Invalid email'),
    age: isInRange({ min: 18, max: 99 }, 'Age must be 18-99'),
    website: matches(/^https?:\/\//, 'Must start with http'),
    terms: isNotEmpty('Must accept terms'),
  },
});
```

## Focus First Error

```tsx
<form
  onSubmit={form.onSubmit(
    (values) => { /* success */ },
    (errors) => {
      const firstErrorPath = Object.keys(errors)[0];
      form.getInputNode(firstErrorPath)?.focus();
    }
  )}
>
```
