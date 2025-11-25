import {withSentryConfig} from '@sentry/nextjs';
import type { NextConfig } from 'next';

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['img.clerk.com', 'randomuser.me', 'cdn.prod.website-files.com'], // opcional, útil para compatibilidad con versiones anteriores
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '**', // permite todas las rutas dentro de este dominio
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.prod.website-files.com',
        pathname: '**',
      },
    ],
  },
  // Webpack configuration to handle server-only packages
  webpack: (config, { isServer }) => {
    // Only apply these configs on the client side
    if (!isServer) {
      // Mark server-only packages as external for client-side bundles
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        crypto: false,
        stream: false,
        os: false,
        path: false,
      };

      // Exclude server-only packages from client bundle
      config.externals = [...(config.externals || [])];

      // Add regex patterns to exclude nodemailer and related packages
      config.externals.push({
        nodemailer: 'nodemailer',
        'nodemailer/lib/dkim': 'nodemailer/lib/dkim',
        '@/modules/mailer': '@/modules/mailer',
      });
    }

    return config;
  },
  // Ensure server-only modules are not bundled for client
  experimental: {
    serverComponentsExternalPackages: ['nodemailer'],
  },
};

export default withSentryConfig(nextConfig, {
// For all available options, see:
// https://www.npmjs.com/package/@sentry/webpack-plugin#options

org: "karen-ortiz",
project: "aurinplattform",

// Only print logs for uploading source maps in CI
silent: !process.env.CI,

// For all available options, see:
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

// Upload a larger set of source maps for prettier stack traces (increases build time)
widenClientFileUpload: true,

// Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
// This can increase your server load as well as your hosting bill.
// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
// side errors will fail.
// tunnelRoute: "/monitoring",

// Automatically tree-shake Sentry logger statements to reduce bundle size
disableLogger: true,

// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
// See the following for more information:
// https://docs.sentry.io/product/crons/
// https://vercel.com/docs/cron-jobs
automaticVercelMonitors: true,
});