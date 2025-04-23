module.exports = {
    webpack: {
      configure: (webpackConfig) => {
        webpackConfig.resolve.fallback = {
          ...webpackConfig.resolve.fallback,
          crypto: require.resolve('crypto-browserify'),
        };
        return webpackConfig;
      },
    },
  };