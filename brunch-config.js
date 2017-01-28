module.exports = {
  files: {
    javascripts: {
      joinTo: {
        'vendor.js': /^(?!app)/,
        'app.js': /^app/
      }
    }
  },

  plugins: {
    babel: {
      presets: ['es2015', 'react']
    }
  }
}
