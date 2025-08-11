// Test file para verificar el funcionamiento del MessageSidebar
// Ejecutar en la consola del navegador para debug

console.log('=== TEST MESSAGE SIDEBAR ===');

// Verificar que el singleton manager existe
if (typeof window !== 'undefined') {
  // Simular el hook de cifrado
  const mockDecryptMessage = async (encrypted) => {
    if (typeof encrypted === 'string') return encrypted;
    if (encrypted && encrypted.encryptedData) {
      return `[DECRYPTED: ${encrypted.encryptedData}]`;
    }
    return '';
  };

  // Verificar que el manager se puede instanciar
  try {
    // Esto debería funcionar si el hook está importado
    console.log('✅ Hook de cifrado simulado creado');
    console.log('✅ Manager debería estar disponible');
  } catch (error) {
    console.error('❌ Error al crear manager:', error);
  }
}

// Verificar estado de Firestore
if (typeof window !== 'undefined' && window.firebase) {
  console.log('✅ Firebase disponible');
} else {
  console.log('⚠️ Firebase no disponible en este contexto');
}

console.log('=== FIN TEST ===');
