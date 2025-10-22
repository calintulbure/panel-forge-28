import Select, { MultiValue, StylesConfig } from 'react-select';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({ options, value, onChange, placeholder = "Select...", className }: MultiSelectProps) {
  const selectedOptions = options.filter(opt => value.includes(opt.value));

  const handleChange = (newValue: MultiValue<MultiSelectOption>) => {
    onChange(newValue.map(v => v.value));
  };

  const customStyles: StylesConfig<MultiSelectOption, true> = {
    control: (base, state) => ({
      ...base,
      minHeight: '36px',
      height: '36px',
      fontSize: '0.875rem',
      borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--input))',
      backgroundColor: 'hsl(var(--background))',
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring) / 0.2)' : 'none',
      '&:hover': {
        borderColor: 'hsl(var(--ring))',
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '0 8px',
      maxHeight: '34px',
      overflowY: 'auto',
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      color: 'hsl(var(--foreground))',
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      zIndex: 50,
    }),
    menuList: (base) => ({
      ...base,
      padding: 0,
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '0.875rem',
      backgroundColor: state.isSelected
        ? 'hsl(var(--accent))'
        : state.isFocused
        ? 'hsl(var(--accent))'
        : 'transparent',
      color: state.isSelected ? 'hsl(var(--accent-foreground))' : 'hsl(var(--foreground))',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'hsl(var(--accent))',
      },
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--secondary))',
      borderRadius: '4px',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: 'hsl(var(--secondary-foreground))',
      fontSize: '0.75rem',
      padding: '2px 6px',
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: 'hsl(var(--secondary-foreground))',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'hsl(var(--destructive))',
        color: 'hsl(var(--destructive-foreground))',
      },
    }),
    placeholder: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      fontSize: '0.875rem',
    }),
    clearIndicator: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      cursor: 'pointer',
      '&:hover': {
        color: 'hsl(var(--foreground))',
      },
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      cursor: 'pointer',
      padding: '0 8px',
      '&:hover': {
        color: 'hsl(var(--foreground))',
      },
    }),
  };

  return (
    <Select
      isMulti
      options={options}
      value={selectedOptions}
      onChange={handleChange}
      placeholder={placeholder}
      styles={customStyles}
      className={className}
      classNamePrefix="react-select"
      isClearable
      closeMenuOnSelect={false}
    />
  );
}
