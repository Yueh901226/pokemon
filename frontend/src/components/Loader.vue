<template>
  <div class="loader-container">
    <div class="pokeball-spinner">
      <div class="pokeball-top"></div>
      <div class="pokeball-center-line"></div>
      <div class="pokeball-center-button"></div>
      <div class="pokeball-bottom"></div>
    </div>
    <span class="loader-text">載入中，召喚寶可夢...</span>
  </div>
</template>

<style scoped>
.loader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  width: 100%;
}

.pokeball-spinner {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 4px solid var(--text-primary);
  position: relative;
  overflow: hidden;
  animation: spin 1.2s cubic-bezier(0.6, 0.2, 0.4, 0.8) infinite;
  box-shadow: 0 0 15px var(--primary-glow);
  background: var(--bg-panel);
}

.pokeball-top {
  width: 100%;
  height: 50%;
  background: var(--primary-color);
  border-bottom: 2px solid var(--text-primary);
}

.pokeball-bottom {
  width: 100%;
  height: 50%;
  background: #ffffff;
}

.pokeball-center-button {
  width: 16px;
  height: 16px;
  background: #ffffff;
  border: 3px solid var(--text-primary);
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  box-shadow: 0 0 0 2px #ffffff;
}

.loader-text {
  margin-top: 16px;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
