import type { ThemeConfig } from 'antd'

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#0f766e',
    colorPrimaryHover: '#115e59',
    colorLink: '#0f766e',
    colorLinkHover: '#115e59',
    colorText: '#1f2937',
    colorTextHeading: '#1f2937',
    colorTextSecondary: '#5b6b66',
    colorBgLayout: '#f4f7f6',
    colorBgContainer: '#ffffff',
    colorBorder: '#d8e2df',
    colorBorderSecondary: '#e6eeeb',
    colorError: '#b91c1c',
    colorWarning: '#c2410c',
    borderRadius: 10,
    borderRadiusLG: 12,
    controlHeight: 40,
    fontSize: 15,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#f4f7f6',
      headerHeight: 64,
      headerPadding: '0 24px',
    },
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      fontWeight: 500,
    },
    Input: {
      activeShadow: '0 0 0 2px rgba(15, 118, 110, 0.16)',
    },
  },
}
