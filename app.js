// 1. ตั้งค่าและเชื่อมต่อ Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDY-LYy_ci9Jz5Wre4zDRCr8TP-58ng-bo",
    authDomain: "my-office-quiz.firebaseapp.com",
    projectId: "my-office-quiz",
    storageBucket: "my-office-quiz.firebasestorage.app",
    messagingSenderId: "1075817017274",
    appId: "1:1075817017274:web:ac54fd1f8a9a0e3d06f783",
    measurementId: "G-ZDXMQC8QB9"
};

// เริ่มต้นใช้งาน Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ตัวแปรสำหรับเก็บข้อมูลผู้ที่กำลังสอบ
let currentUser = {};

// 2. ฟังก์ชันตรวจสอบการเข้าสู่ระบบและรหัส PIN
async function checkLogin() {
    const id = document.getElementById('emp-id').value.trim();
    const name = document.getElementById('emp-name').value.trim();
    const pin = document.getElementById('emp-pin').value.trim();
    const loginBtn = document.getElementById('login-btn');

    if (!id || !pin) {
        alert('กรุณากรอกรหัสพนักงานและรหัส PIN ');
        return;
    }
    if (pin.length !== 4 || isNaN(pin)) {
        alert('รหัส PIN ต้องเป็นตัวเลข 4 หลักเท่านั้น');
        return;
    }

    loginBtn.innerText = "กำลังตรวจสอบ...";
    loginBtn.disabled = true;

    try {
        const docRef = db.collection('employees').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            alert('❌ ไม่พบรหัสพนักงานนี้ในระบบ กรุณาตรวจสอบอีกครั้ง');
            resetLoginButton();
            return;
        }

        const empData = docSnap.data();

        if (empData.pin_code === "") {
            if (!name) {
                alert('💡 เนื่องจากการเข้าใช้งานครั้งแรก กรุณากรอก "ชื่อ-นามสกุล" เพื่อยืนยันตัวตนในการตั้งรหัส PIN ');
                resetLoginButton();
                return;
            }
            if (name !== empData.employee_name) {
                alert('❌ ชื่อ-นามสกุลไม่ตรงกับรหัสพนักงานนี้ในฐานข้อมูล');
                resetLoginButton();
                return;
            }

            await docRef.update({ pin_code: pin });
            alert('🎉 ตั้งรหัส PIN สำเร็จ! รหัสนี้จะใช้สำหรับเข้าสอบในครั้งต่อไป');
            
            // ลบเรื่องชุดข้อสอบออกไปแล้ว
            currentUser = { empId: id, empName: empData.employee_name, empDept: empData.department };

        } else {
            if (pin !== empData.pin_code) {
                alert('❌ รหัส PIN ไม่ถูกต้อง กรุณากรอกรหัสที่คุณเคยตั้งไว้');
                resetLoginButton();
                return;
            }
            // ลบเรื่องชุดข้อสอบออกไปแล้ว
            currentUser = { empId: id, empName: empData.employee_name, empDept: empData.department };
        }

        // แสดงผลแค่ ชื่อ รหัส และ แผนก
        document.getElementById('user-display').innerText = 
            `ผู้สอบ: ${currentUser.empName} (${currentUser.empId}) | แผนก: ${currentUser.empDept}`;

        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('quiz-screen').classList.add('active');

        console.log("เข้าสู่ระบบสำเร็จ:", currentUser);
        
        // สเต็ปต่อไป: เราจะเขียนฟังก์ชันดึงข้อสอบมาสุ่ม 20 ข้อตรงนี้ครับ

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการล็อกอิน:", error);
        alert("เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง");
        resetLoginButton();
    }
}
