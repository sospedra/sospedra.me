import React from 'react'

const styles = {
  loading: {
    alignItems: 'center',
    background: 'linear-gradient(to bottom, #430840 0%,#690b63 50%)',
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },
  hourglass: {
    width: 60,
    animation: 'rotate 4s ease-in-out 0s infinite'
  }
}

const Loading = () => (
  <aside style={styles.loading}>
    <style>{`
      @keyframes rotate {
        0% { transform: rotate(0); }
        20% { transform: rotate(180deg); }
        50% { transform: rotate(180deg); }
        70% { transform: rotate(360deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
    <img src='static/hourglass.svg' alt='retro-loader' style={styles.hourglass} />
  </aside>
)

export default Loading
