module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current', // Target the currently running Node version
        },
      },
    ],
  ],
};
