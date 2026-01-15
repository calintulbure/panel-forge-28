import Select, { SingleValue, StylesConfig } from 'react-select';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({ options, value, onChange, placeholder = "Select...", className }: SearchableSelectProps) {
  const selectedOption = options.find(opt => opt.value === value) || null;

  const handleChange = (newValue: SingleValue<SearchableSelectOption>) => {
    onChange(newValue ? newValue.value : '');
  };

  const customStyles: StylesConfig<SearchableSelectOption, false> = {
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
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      color: 'hsl(var(--foreground))',
    }),
    singleValue: (base) => ({
      ...base,
      color: 'hsl(var(--foreground))',
      fontSize: '0.875rem',
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      zIndex: 9999,
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
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
      options={options}
      value={selectedOption}
      onChange={handleChange}
      placeholder={placeholder}
      styles={customStyles}
      className={className}
      classNamePrefix="react-select"
      isClearable
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      menuPosition="fixed"
    />
  );
}
