// ======================================================
// ADMIN DASHBOARD LOGIC (FIREBASE EDITION)
// ======================================================

const wheelInput = document.getElementById('wheelConfigInput');
const saveBtn = document.getElementById('saveConfigBtn');
const tableBody = document.getElementById('resultsTableBody');

// 1. INITIALIZATION
// -----------------
function initAdmin() {
    console.log("Initializing Admin Dashboard...");

    // Check if Firebase is loaded
    if (typeof db === 'undefined') {
        alert("Error: Database not connected. Make sure you have created config.js and added your keys!");
        return;
    }

    // A. Load Current Wheel Configuration
    db.collection("settings").doc("wheelConfig").get().then((doc) => {
        if (doc.exists && doc.data().items) {
            // Join array back into string for textarea
            wheelInput.value = doc.data().items.join('\n');
        } else {
            // Default placeholder if empty
            wheelInput.value = "Prize A\nPrize B\nPrize C";
        }
    }).catch((error) => {
        console.error("Error loading config:", error);
    });

    // B. Listen for Live Game Records
    // .onSnapshot() keeps the table updated in Real-Time
    db.collection("records").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        
        // Clear current table rows
        tableBody.innerHTML = '';

        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="3">No records yet.</td></tr>';
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Format Timestamp
            let timeStr = "Pending...";
            if (data.timestamp) {
                const date = data.timestamp.toDate();
                timeStr = date.toLocaleDateString() + " " + date.toLocaleTimeString();
            }

            // Create Table Row
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${timeStr}</td>
                <td><strong>${escapeHtml(data.user)}</strong></td>
                <td style="color:#27ae60; font-weight:bold;">${escapeHtml(data.result)}</td>
            `;
            tableBody.appendChild(row);
        });
    });
}

// 2. SAVE CONFIGURATION
// --------------------
saveBtn.addEventListener('click', () => {
    const rawText = wheelInput.value;
    // Split by new line and remove empty entries
    const items = rawText.split('\n').filter(n => n.trim() !== '');

    saveBtn.innerText = "Saving...";
    saveBtn.disabled = true;

    db.collection("settings").doc("wheelConfig").set({
        items: items
    })
    .then(() => {
        alert('✅ Wheel Updated! All players will see these changes immediately.');
        saveBtn.innerText = "Save Wheel Configuration";
        saveBtn.disabled = false;
    })
    .catch((error) => {
        console.error("Error saving:", error);
        alert("Error saving configuration.");
        saveBtn.innerText = "Save Wheel Configuration";
        saveBtn.disabled = false;
    });
});

// 3. RESET DATA (CLEAR HISTORY)
// -----------------------------
// Attached to window so the HTML button can call it
window.clearAllData = function() {
    if(confirm('⚠️ ARE YOU SURE? \n\nThis will delete ALL player history and results permanently. This cannot be undone.')) {
        
        // Firestore doesn't allow deleting a whole collection in one go from client.
        // We must fetch all documents and delete them one by one.
        
        db.collection("records").get().then((snapshot) => {
            if (snapshot.size === 0) return alert("No records to delete.");

            const batch = db.batch();
            
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            return batch.commit();
        }).then(() => {
            alert("All records have been wiped.");
            // Also clear the player history cache if you want to allow re-plays (optional)
            // But since uniqueness is checked against DB now, wiping DB allows re-plays automatically.
        }).catch((error) => {
            console.error("Error clearing data:", error);
            alert("Error deleting data.");
        });
    }
}

// Helper to prevent HTML injection in names
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Start
initAdmin();