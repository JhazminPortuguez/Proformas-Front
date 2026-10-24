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

interface TextFieldControlProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel" | "password" | "number" | "url";
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
      name={name}
      value={value}
      onChange={onChange}
      type={type}
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
        fullWidth
        placeholder={placeholder}
        inputMode={inputMode}
        min={min}
        step={step}
        autoFocus={autoFocus}
      />

      {description && !error ? <Description>{description}</Description> : null}
      <FieldError className="text-xs">{error}</FieldError>
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
      name={name}
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

      <TextArea fullWidth rows={rows} placeholder={placeholder} />

      {description && !error ? <Description>{description}</Description> : null}
      <FieldError className="text-xs">{error}</FieldError>
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
      name={name}
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

      <Select.Trigger>
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
      <FieldError className="text-xs">{error}</FieldError>
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
