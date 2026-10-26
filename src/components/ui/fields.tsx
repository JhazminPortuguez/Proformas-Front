"use client";

import type { ReactNode } from "react";
import {
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  Select,
  Switch,
  TextArea,
  TextField,
} from "@heroui/react";

interface BaseFieldProps {
  name: string;
  label: string;
  error?: string;
  description?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
}

/**
 * FieldError queda enlazado al input vía aria-describedby; el wrapper con
 * role="alert" anuncia el cambio apenas aparece el error.
 */
function FieldErrorMessage({ error }: { error?: string }) {
  if (!error) return null;

  return (
    <span role="alert">
      <FieldError className="text-xs">{error}</FieldError>
    </span>
  );
}

interface TextFieldControlProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel" | "password" | "number" | "url" | "date";
  autoComplete?: string;
  placeholder?: string;
  inputMode?: "text" | "email" | "tel" | "numeric" | "decimal";
  min?: number;
  step?: number;
  autoFocus?: boolean;
}

export function TextFieldControl({
  name,
  label,
  value,
  onChange,
  error,
  description,
  isRequired,
  isDisabled,
  type = "text",
  autoComplete,
  placeholder,
  inputMode,
  min,
  step,
  autoFocus,
}: TextFieldControlProps) {
  return (
    <TextField
      aria-label={label}
      name={name}
      data-field={name}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={Boolean(error)}
      fullWidth
      className="flex flex-col gap-1.5"
    >
      <Label>
        {label}
        {isRequired ? (
          <span aria-hidden className="text-danger">
            {" "}
            *
          </span>
        ) : null}
      </Label>

      <Input
        aria-label={label}
        fullWidth
        type={type}
        placeholder={placeholder}
        inputMode={inputMode}
        min={min}
        step={step}
        autoFocus={autoFocus}
      />

      {description && !error ? <Description>{description}</Description> : null}
      <FieldErrorMessage error={error} />
    </TextField>
  );
}

interface TextAreaControlProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

export function TextAreaControl({
  name,
  label,
  value,
  onChange,
  error,
  description,
  isRequired,
  isDisabled,
  rows = 3,
  placeholder,
}: TextAreaControlProps) {
  return (
    <TextField
      aria-label={label}
      name={name}
      data-field={name}
      value={value}
      onChange={onChange}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={Boolean(error)}
      fullWidth
      className="flex flex-col gap-1.5"
    >
      <Label>
        {label}
        {isRequired ? (
          <span aria-hidden className="text-danger">
            {" "}
            *
          </span>
        ) : null}
      </Label>

      <TextArea aria-label={label} fullWidth rows={rows} placeholder={placeholder} />

      {description && !error ? <Description>{description}</Description> : null}
      <FieldErrorMessage error={error} />
    </TextField>
  );
}

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectControlProps<T extends string> extends BaseFieldProps {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
}

export function SelectControl<T extends string>({
  name,
  label,
  value,
  onChange,
  options,
  error,
  description,
  isRequired,
  isDisabled,
}: SelectControlProps<T>) {
  return (
    <Select
      aria-label={label}
      name={name}
      data-field={name}
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key !== null) onChange(String(key) as T);
      }}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={Boolean(error)}
      fullWidth
      className="flex flex-col gap-1.5"
    >
      <Label>
        {label}
        {isRequired ? (
          <span aria-hidden className="text-danger">
            {" "}
            *
          </span>
        ) : null}
      </Label>

      <Select.Trigger aria-label={label}>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>

      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              key={option.value}
              id={option.value}
              textValue={option.label}
            >
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>

      {description && !error ? <Description>{description}</Description> : null}
      <FieldErrorMessage error={error} />
    </Select>
  );
}

interface SwitchControlProps {
  name: string;
  label: string;
  isSelected: boolean;
  onChange: (value: boolean) => void;
  description?: ReactNode;
  isDisabled?: boolean;
}

export function SwitchControl({
  name,
  label,
  isSelected,
  onChange,
  description,
  isDisabled,
}: SwitchControlProps) {
  return (
    <Switch
      name={name}
      data-field={name}
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      size="sm"
    >
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Label className="text-sm font-medium">{label}</Label>
      </Switch.Content>

      {description ? <Description>{description}</Description> : null}
    </Switch>
  );
}
