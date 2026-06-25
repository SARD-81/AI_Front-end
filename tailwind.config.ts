import type {Config} from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-vazirmatn)', 'ui-sans-serif', 'system-ui']
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          foreground: 'hsl(var(--danger-foreground))',
          surface: 'hsl(var(--danger-surface))',
          border: 'hsl(var(--danger-border))',
          text: 'hsl(var(--danger-text))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          surface: 'hsl(var(--success-surface))',
          border: 'hsl(var(--success-border))',
          text: 'hsl(var(--success-text))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          surface: 'hsl(var(--warning-surface))',
          border: 'hsl(var(--warning-border))',
          text: 'hsl(var(--warning-text))'
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
          surface: 'hsl(var(--info-surface))',
          border: 'hsl(var(--info-border))',
          text: 'hsl(var(--info-text))'
        },
        surface: {
          1: 'hsl(var(--surface-1))',
          2: 'hsl(var(--surface-2))',
          base: 'hsl(var(--surface-base))',
          card: 'hsl(var(--surface-card))',
          elevated: 'hsl(var(--surface-elevated))',
          subtle: 'hsl(var(--surface-subtle))',
          overlay: 'hsl(var(--surface-overlay))'
        },
        field: {
          DEFAULT: 'hsl(var(--field))',
          foreground: 'hsl(var(--field-foreground))',
          border: 'hsl(var(--field-border))',
          placeholder: 'hsl(var(--field-placeholder))',
          focus: 'hsl(var(--field-focus))'
        },
        menu: {
          DEFAULT: 'hsl(var(--menu))',
          foreground: 'hsl(var(--menu-foreground))',
          border: 'hsl(var(--menu-border))',
          hover: 'hsl(var(--menu-hover))',
          'hover-foreground': 'hsl(var(--menu-hover-foreground))'
        }
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)'
      },
      boxShadow: {
        soft: '0 16px 36px -28px hsl(var(--shadow-color) / var(--shadow-strength))',
        card: '0 10px 24px -18px hsl(var(--shadow-color) / calc(var(--shadow-strength) + 4%))'
      }
    }
  },
  plugins: []
};

export default config;
