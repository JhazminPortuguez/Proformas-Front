"use client";

import {
  ComboBox,
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
} from "@heroui/react";
import { normalizarBusqueda } from "@/lib/proformas";

export interface CatalogOption {
  id: number;
  label: string;
  description?: string;
}

interface CatalogSelectProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly CatalogOption[];
  error?: string;
  description?: string;
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
}

/**
 * Selector con búsqueda para catálogos de hasta 100 registros.
 *
 * Es un ComboBox de HeroUI: el input filtra por `textValue`, el teclado navega
 * las opciones y el valor viaja como string en el formulario. El `data-field`
 * queda en la raíz para que `use-form-errors` pueda enfocarlo ante un 422.
 */
export function CatalogSelect({
  name,
  label,
  value,
  onChange,
  options,
  error,
  description,
  placeholder = "Buscar…",
  isRequired,
  isDisabled,
}: CatalogSelectProps) {
  return (
    <ComboBox
      aria-label={label}
      data-field={name}
      selectedKey={value === "" ? null : value}
      onSelectionChange={(key) => onChange(key === null ? "" : String(key))}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={Boolean(error)}
      fullWidth
      menuTrigger="input"
      defaultFilter={(textValue, inputValue) =>
        normalizarBusqueda(textValue).includes(normalizarBusqueda(inputValue))
      }
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

      <ComboBox.InputGroup>
        <Input aria-label={label} placeholder={placeholder} />
        <ComboBox.Trigger aria-label={`Mostrar opciones de ${label}`} />
      </ComboBox.InputGroup>

      <ComboBox.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              key={option.id}
              id={String(option.id)}
              textValue={option.label}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{option.label}</span>
                {option.description ? (
                  <span className="truncate text-xs text-muted">
                    {option.description}
                  </span>
                ) : null}
              </span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </ComboBox.Popover>

      {description && !error ? <Description>{description}</Description> : null}
      {error ? (
        <span role="alert">
          <FieldError className="text-xs">{error}</FieldError>
        </span>
      ) : null}
    </ComboBox>
  );
}
