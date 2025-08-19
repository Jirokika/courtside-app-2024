// Courtside Cache Clearer - Run this in browser console
console.log('🧹 Courtside Cache Clearer');

// Function to clear all cache
function clearAllCache() {
    console.log('Clearing all cache...');
    
    // Clear localStorage
    const keys = Object.keys(localStorage);
    let removedCount = 0;
    
    keys.forEach(key => {
        localStorage.removeItem(key);
        removedCount++;
        console.log('Removed:', key);
    });
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    console.log(`✅ Cleared ${removedCount} localStorage items and sessionStorage`);
    return removedCount;
}

// Function to clear only Courtside-related cache
function clearCourtsideCache() {
    console.log('Clearing Courtside-related cache...');
    
    const keys = Object.keys(localStorage);
    let removedCount = 0;
    
    keys.forEach(key => {
        if (key.includes('courtside') || 
            key.includes('booking') || 
            key.includes('auth') || 
            key.includes('cache') ||
            key.includes('token') ||
            key.includes('user')) {
            localStorage.removeItem(key);
            removedCount++;
            console.log('Removed:', key);
        }
    });
    
    console.log(`✅ Cleared ${removedCount} Courtside-related keys`);
    return removedCount;
}

// Function to check current cache
function checkCache() {
    console.log('📊 Current cache status:');
    
    const localStorageData = {};
    const sessionStorageData = {};
    
    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
            localStorageData[key] = localStorage.getItem(key);
        }
    }
    
    // Check sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
            sessionStorageData[key] = sessionStorage.getItem(key);
        }
    }
    
    console.log(`localStorage items: ${Object.keys(localStorageData).length}`);
    Object.keys(localStorageData).forEach(key => {
        console.log(`  - ${key}: ${localStorageData[key].substring(0, 50)}...`);
    });
    
    console.log(`sessionStorage items: ${Object.keys(sessionStorageData).length}`);
    Object.keys(sessionStorageData).forEach(key => {
        console.log(`  - ${key}: ${sessionStorageData[key].substring(0, 50)}...`);
    });
}

// Auto-run check
console.log('🔍 Checking current cache...');
checkCache();

console.log('\n📋 Available commands:');
console.log('- clearAllCache() - Clear all localStorage and sessionStorage');
console.log('- clearCourtsideCache() - Clear only Courtside-related keys');
console.log('- checkCache() - Check current cache status'); 