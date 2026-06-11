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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUser = {};
let quizQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let tempSelectedAnswer = null; // เก็บตัวเลือกที่พนักงานจิ้มไว้ชั่วคราว (ยังไม่ยืนยัน)

// 2. ฟังก์ชัน Login
async function checkLogin() {
    const id = document.getElementById('emp-id').value.trim();
    const name = document.getElementById('emp-name').value.trim();
    const pin = document.getElementById('emp-pin').value.trim();
    const loginBtn = document.getElementById('login-btn');

    if (!id || !pin) { alert('กรุณากรอกรหัสพนักงานและรหัส PIN ด้วยครับ'); return; }
    if (pin.length !== 4 || isNaN(pin)) { alert('รหัส PIN ต้องเป็นตัวเลข 4 หลักเท่านั้นครับ'); return; }

    loginBtn.innerText = "กำลังตรวจสอบ..."; loginBtn.disabled = true;

    try {
        const docRef = db.collection('employees').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) { alert('❌ ไม่พบรหัสพนักงานนี้ในระบบ'); resetLoginButton(); return; }

        const empData = docSnap.data();

        if (empData.pin_code === "") {
            if (!name) { alert('💡 เข้าใช้งานครั้งแรก กรุณากรอกชื่อ-นามสกุลด้วยครับ'); resetLoginButton(); return; }
            if (name !== empData.employee_name) { alert('❌ ชื่อ-นามสกุลไม่ตรงกับรหัสพนักงานในฐานข้อมูล'); resetLoginButton(); return; }
            await docRef.update({ pin_code: pin });
            alert('🎉 ตั้งรหัส PIN สำเร็จ!');
            currentUser = { empId: id, empName: empData.employee_name, empDept: empData.department };
        } else {
            if (pin !== empData.pin_code) { alert('❌ รหัส PIN ไม่ถูกต้อง'); resetLoginButton(); return; }
            currentUser = { empId: id, empName: empData.employee_name, empDept: empData.department };
        }

        document.getElementById('user-display').innerText = `${currentUser.empName} | ${currentUser.empDept}`;
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('quiz-screen').classList.add('active');

        loadQuestions();
    } catch (error) {
        console.error("Login Error:", error); alert("เกิดข้อผิดพลาดของระบบ"); resetLoginButton();
    }
}

function resetLoginButton() {
    const loginBtn = document.getElementById('login-btn');
    loginBtn.innerText = "ตรวจสอบข้อมูลและเข้าสอบ"; loginBtn.disabled = false;
}

// 3. ดึงและสุ่มข้อสอบ 20 ข้อ
async function loadQuestions() {
    try {
        const querySnapshot = await db.collection('questions').get();
        let allQuestions = [];
        querySnapshot.forEach((doc) => allQuestions.push(doc.data()));

        if (allQuestions.length < 20) { alert('⚠️ ข้อสอบในระบบมีไม่ถึง 20 ข้อ กรุณาเพิ่มข้อสอบก่อนครับ'); return; }

        for (let i = allQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
        }

        quizQuestions = allQuestions.slice(0, 20);
        currentQuestionIndex = 0; score = 0;
        displayQuestion();
    } catch (error) {
        console.error("Load Questions Error:", error);
        document.getElementById('quiz-area').innerHTML = "<p style='color:red;'>ไม่สามารถดึงข้อสอบได้</p>";
    }
}

// 4. แสดงข้อสอบ
function displayQuestion() {
    tempSelectedAnswer = null; // รีเซ็ตตัวเลือกที่จำไว้ทุกครั้งที่ขึ้นข้อใหม่
    
    // อัปเดต Progress Bar
    const progressPercent = ((currentQuestionIndex) / 20) * 100;
    document.getElementById('progress-bar-fill').style.width = `${progressPercent}%`;
    document.getElementById('progress-text').innerText = `ข้อที่ ${currentQuestionIndex + 1} / 20`;

    const quizArea = document.getElementById('quiz-area');
    const currentQuiz = quizQuestions[currentQuestionIndex];

    let html = `<div style="margin-bottom: 20px; font-weight: 500; font-size: 18px; color: var(--navy); line-height: 1.5;">${currentQuestionIndex + 1}. ${currentQuiz.question}</div>`;

    currentQuiz.options.forEach((option, index) => {
        const optionNum = index + 1;
        html += `<button class="option-btn" id="opt-${optionNum}" onclick="selectOption(${optionNum})">${optionNum}. ${option}</button>`;
    });

    html += `
        <button id="confirm-ans-btn" class="btn-primary" style="display: none; margin-top: 15px;" onclick="promptConfirmAnswer()">🔒 ยืนยันคำตอบ</button>
        
        <div id="explanation-box" style="display: none; padding: 15px; border-radius: 10px; margin: 20px 0; font-size: 15px; line-height: 1.5;"></div>
        
        <button id="next-btn" class="btn-secondary" style="display: none; width: 100%; margin-top: 10px; border-color: var(--navy);" onclick="nextQuestion()">
            ${currentQuestionIndex === 19 ? '✅ ส่งแบบทดสอบ' : 'ข้อถัดไป ➡️'}
        </button>
    `;
    quizArea.innerHTML = html;
}

// 5. ไฮไลท์ตัวเลือกชั่วคราว (ยังไม่เฉลย)
function selectOption(selectedNum) {
    tempSelectedAnswer = selectedNum;
    
    // ล้างไฮไลท์จากปุ่มอื่นทั้งหมด และใส่ให้ปุ่มที่โดนคลิก
    for(let i=1; i<=4; i++) {
        document.getElementById(`opt-${i}`).classList.remove('selected');
    }
    document.getElementById(`opt-${selectedNum}`).classList.add('selected');

    // โชว์ปุ่มยืนยันคำตอบ
    document.getElementById('confirm-ans-btn').style.display = 'block';
}

// 6. ระบบ Custom Modal สำหรับแจ้งเตือนต่างๆ
function showModal(title, desc, confirmCallback, confirmText = "ยืนยัน") {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-desc').innerText = desc;
    
    const confirmBtn = document.getElementById('modal-confirm-btn');
    confirmBtn.innerText = confirmText;
    
    // ล้าง event เดิมและใส่ event ใหม่
    confirmBtn.onclick = () => {
        closeModal();
        confirmCallback();
    };

    document.getElementById('custom-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('custom-modal').style.display = 'none';
}

// 7. ลอจิกแจ้งเตือนตอนกดยืนยันคำตอบ
function promptConfirmAnswer() {
    showModal(
        "ยืนยันคำตอบ?", 
        "เมื่อยืนยันแล้วคุณจะไม่สามารถแก้ไขคำตอบในข้อนี้ได้อีก ต้องการส่งคำตอบเลยใช่หรือไม่?", 
        lockAndCheckAnswer, 
        "ส่งคำตอบ"
    );
}

// ลอจิกแจ้งเตือนตอนกด Back กลับไปหน้า Login
function promptBackToLogin() {
    showModal(
        "ต้องการออกจากการสอบ?", 
        "คำตอบและคะแนนที่ทำไว้ทั้งหมดจะสูญหาย และคุณจะต้องเริ่มต้นทำแบบทดสอบใหม่", 
        () => { location.reload(); }, 
        "ออกจากระบบ"
    );
}

// 8. เฉลยคำตอบหลังกดยืนยัน
function lockAndCheckAnswer() {
    const currentQuiz = quizQuestions[currentQuestionIndex];
    const correctNum = currentQuiz.answer;
    
    // ซ่อนปุ่มยืนยัน ป้องกันกดซ้ำ
    document.getElementById('confirm-ans-btn').style.display = 'none';
    
    // ล็อกปุ่มทั้งหมด
    for(let i=1; i<=4; i++) {
        const btn = document.getElementById(`opt-${i}`);
        btn.disabled = true;
        btn.classList.remove('selected'); // เอาสีไฮไลท์ตอนแรกออก
    }

    const selectedBtn = document.getElementById(`opt-${tempSelectedAnswer}`);
    const correctBtn = document.getElementById(`opt-${correctNum}`);

    if (tempSelectedAnswer === correctNum) {
        selectedBtn.classList.add('correct');
        score++;
    } else {
        selectedBtn.classList.add('wrong');
        correctBtn.classList.add('correct');
    }

    // โชว์คำอธิบาย
    const expBox = document.getElementById('explanation-box');
    expBox.style.display = 'block';
    if (tempSelectedAnswer === correctNum) {
        expBox.style.backgroundColor = '#fdfaf3'; expBox.style.color = 'var(--gold)'; expBox.style.border = '1px solid var(--gold)';
        expBox.innerHTML = `<b>ถูกต้อง!</b> ✨ <br>${currentQuiz.explanation || ''}`;
    } else {
        expBox.style.backgroundColor = '#fce8e6'; expBox.style.color = '#c5221f';
        expBox.innerHTML = `<b>ยังไม่ถูกนะ.. เฉลยคือข้อ ${correctNum}</b> 💡 <br>${currentQuiz.explanation || ''}`;
    }

    // โชว์ปุ่มถัดไป
    document.getElementById('next-btn').style.display = 'block';
}

// 9. ไปข้อถัดไป
function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < 20) { displayQuestion(); } 
    else { showResult(); }
}

// 10. สรุปผล
async function showResult() {
    // ให้ Progress Bar เต็ม 100%
    document.getElementById('progress-bar-fill').style.width = '100%';
    document.getElementById('quiz-screen').classList.remove('active');
    document.getElementById('result-screen').classList.add('active');

    const passed = score >= 16;
    const statusText = passed ? "🎉 ผ่านเกณฑ์การประเมิน" : "❌ ไม่ผ่านเกณฑ์การประเมิน";
    const statusColor = passed ? "#137333" : "#c5221f";
    const statusBg = passed ? "#e6f4ea" : "#fce8e6";

    document.getElementById('result-area').innerHTML = `
        <div style="text-align: center; padding: 30px; border-radius: 16px; background-color: ${statusBg}; color: ${statusColor}; margin-bottom: 25px;">
            <h3 style="margin: 0 0 10px 0; font-size: 24px; font-family: 'Prompt';">${statusText}</h3>
            <p style="font-size: 40px; font-weight: 600; margin: 0; font-family: 'Prompt';">${score} / 20</p>
            <p style="margin: 10px 0 0 0; font-size: 15px;">คิดเป็น ${(score/20*100)}% (เกณฑ์ผ่านคือ 80%)</p>
        </div>
        <button class="btn-primary" onclick="location.reload()">กลับสู่หน้าหลัก</button>
    `;

    try {
        await db.collection('quiz_results').add({
            employee_id: currentUser.empId,
            employee_name: currentUser.empName,
            department: currentUser.empDept,
            score: score,
            total_questions: 20,
            percentage: (score / 20 * 100),
            status: passed ? "ผ่าน" : "ไม่ผ่าน",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) { console.error("Error saving result:", error); }
}
