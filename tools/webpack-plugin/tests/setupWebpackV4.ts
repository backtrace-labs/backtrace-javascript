import webpackSources from 'webpack-sources-webpack-4';

jest.mock('webpack-sources', () => webpackSources);

import webpack from 'webpack-4';

jest.mock('webpack', () => webpack);

import tsLoader from 'ts-loader-webpack-4';

jest.mock('ts-loader', () => tsLoader);
