// 1. ตั้งค่าและเชื่อมต่อ Firebase
const firebaseConfig = {
    apiKey: "เอาโค้ดของคุณมาใส่แทนตรงนี้",
    authDomain: "เอาโค้ดของคุณมาใส่แทนตรงนี้",
    projectId: "เอาโค้ดของคุณมาใส่แทนตรงนี้",
    storageBucket: "เอาโค้ดของคุณมาใส่แทนตรงนี้",
    messagingSenderId: "เอาโค้ดของคุณมาใส่แทนตรงนี้",
    appId: "เอาโค้ดของคุณมาใส่แทนตรงนี้"
};

// เริ่มต้นใช้งาน Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ตัวแปรสำหรับเก็บข้อมูลผู้ที่กำลังสอบ
let currentUser = {};

// 2. ฟังก์ชันเริ่มทำแบบทดสอบ (ทำงานเมื่อกดปุ่ม)
function startQuiz() {
    const id = document.getElementById('emp-id').value.trim();
    const name = document.getElementById('emp-name').value.trim();
    const dept = document.getElementById('emp-dept').value;
    const quizSet = document.getElementById('quiz-set').value;

    // เช็คว่ากรอกข้อมูลครบไหม
    if (!id || !name) {
        alert('กรุณากรอกรหัสพนักงานและชื่อ-นามสกุลให้ครบถ้วนครับ');
        return;
    }

    // บันทึกข้อมูลเก็บไว้
    currentUser = {
        empId: id,
        empName: name,
        empDept: dept,
        quizSet: quizSet
    };

    // แสดงชื่อในหน้าสอบ
    document.getElementById('user-display').innerText = 
        `ผู้สอบ: ${name} (${id}) | แผนก: ${dept} | ชุดที่: ${quizSet}`;

    // เปลี่ยนหน้าจอจากหน้า Login ไปหน้า Quiz
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('quiz-screen').classList.add('active');

    console.log("เข้าสู่ระบบสำเร็จ ข้อมูลผู้สอบ:", currentUser);
}
