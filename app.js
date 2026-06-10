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
    const quizSet = document.getElementById('quiz-set').value;
    const loginBtn = document.getElementById('login-btn');

    // 1. ตรวจสอบเบื้องต้นว่ากรอกรหัสพนักงานกับ PIN หรือยัง
    if (!id || !pin) {
        alert('กรุณากรอกรหัสพนักงานและรหัส PIN ด้วยครับ');
        return;
    }
    if (pin.length !== 4 || isNaN(pin)) {
        alert('รหัส PIN ต้องเป็นตัวเลข 4 หลักเท่านั้นครับ');
        return;
    }

    // เปลี่ยนข้อความบนปุ่มระว่างรอระบบตรวจสอบ
    loginBtn.innerText = "กำลังตรวจสอบ...";
    loginBtn.disabled = true;

    try {
        // 2. วิ่งไปค้นหาข้อมูลพนักงานจาก Firebase ดูก่อน
        const docRef = db.collection('employees').doc(id);
        const docSnap = await docRef.get();

        // ตรวจสอบกรณีไม่พบรหัสพนักงานในระบบ
        if (!docSnap.exists) {
            alert('❌ ไม่พบรหัสพนักงานนี้ในระบบ กรุณาตรวจสอบอีกครั้ง');
            resetLoginButton();
            return;
        }

        const empData = docSnap.data();

        // 3. ตรวจสอบสถานะ PIN Code (เช็คว่าเป็นคนเก่าหรือคนใหม่)
        if (empData.pin_code === "") {
            // ---> กรณีเข้าใช้งานครั้งแรก (PIN ในฐานข้อมูลยังว่างอยู่) <---
            if (!name) {
                alert('💡 เนื่องจากการเข้าใช้งานครั้งแรก กรุณากรอก "ชื่อ-นามสกุล" เพื่อยืนยันตัวตนในการตั้งรหัส PIN ด้วยครับ');
                resetLoginButton();
                return;
            }
            // ตรวจสอบว่าชื่อตรงกับที่ระบุใน Excel ไหม
            if (name !== empData.employee_name) {
                alert('❌ ชื่อ-นามสกุลไม่ตรงกับรหัสพนักงานนี้ในฐานข้อมูล');
                resetLoginButton();
                return;
            }

            // ถ้าชื่อตรงกัน ให้บันทึกรหัส PIN ใหม่ลงไปในฐานข้อมูลพนักงานคนนี้ทันที
            await docRef.update({ pin_code: pin });
            alert('🎉 ตั้งรหัส PIN สำเร็จ! รหัสนี้จะใช้สำหรับเข้าสอบในครั้งต่อไป');
            
            // นำข้อมูลแผนกจากคลังข้อมูลมาใช้งานต่อ
            currentUser = { empId: id, empName: empData.employee_name, empDept: empData.department, quizSet: quizSet };

        } else {
            // ---> กรณีเคยเข้ามาตั้งรหัสไว้แล้ว <---
            if (pin !== empData.pin_code) {
                alert('❌ รหัส PIN ไม่ถูกต้อง กรุณากรอกรหัสที่คุณเคยตั้งไว้');
                resetLoginButton();
                return;
            }
            
            // หากรหัสผ่านถูกต้อง (ชื่อจะกรอกหรือไม่กรอกก็ได้ ระบบจะดึงชื่อจากฐานข้อมูลให้เอง)
            currentUser = { empId: id, empName: empData.employee_name, empDept: empData.department, quizSet: quizSet };
        }

        // 4. ผ่านด่านทั้งหมดเรียบร้อย ดำเนินการเริ่มทำแบบทดสอบ
        document.getElementById('user-display').innerText = 
            `ผู้สอบ: ${currentUser.empName} (${currentUser.empId}) | แผนก: ${currentUser.empDept} | ชุดที่: ${currentUser.quizSet}`;

        // สลับหน้าจอ
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('quiz-screen').classList.add('active');

        console.log("เข้าสู่ระบบสำเร็จ:", currentUser);
        // สเต็ปต่อไป: เรียกฟังก์ชันสุ่มข้อสอบมาแสดงผลตรงนี้

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการล็อกอิน:", error);
        alert("เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง");
        resetLoginButton();
    }
}

// ฟังก์ชันคืนค่าปุ่มกดเมื่อเกิดข้อผิดพลาด
function resetLoginButton() {
    const loginBtn = document.getElementById('login-btn');
    loginBtn.innerText = "ตรวจสอบข้อมูลและเข้าสอบ";
    loginBtn.disabled = false;
}
