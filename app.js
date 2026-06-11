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
let userAnswers = []; // ตัวแปร Array ไว้จำคำตอบ 20 ข้อ

// 1. ฟังก์ชัน Login
async function checkLogin() {
    const id = document.getElementById('emp-id').value.trim();
    const name = document.getElementById('emp-name').value.trim();
    const pin = document.getElementById('emp-pin').value.trim();
    const loginBtn = document.getElementById('login-btn');

    if (!id || !pin) { alert('กรุณากรอกรหัสพนักงานและรหัส PIN '); return; }
    
    loginBtn.innerText = "กำลังตรวจสอบ..."; loginBtn.disabled = true;

    try {
        const docRef = db.collection('employees').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) { alert('❌ ไม่พบรหัสพนักงานนี้ในระบบ'); resetLoginButton(); return; }

        const empData = docSnap.data();

        if (empData.pin_code === "") {
            if (!name) { alert('💡 เข้าใช้งานครั้งแรก กรุณากรอกชื่อ-นามสกุล'); resetLoginButton(); return; }
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

// 2. โหลดและสุ่มข้อสอบ
async function loadQuestions() {
    try {
        const querySnapshot = await db.collection('questions').get();
        let allQuestions = [];
        querySnapshot.forEach((doc) => allQuestions.push(doc.data()));

        if (allQuestions.length < 20) { alert('⚠️ ข้อสอบในระบบมีไม่ถึง 20 ข้อ'); return; }

        for (let i = allQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
        }

        quizQuestions = allQuestions.slice(0, 20);
        currentQuestionIndex = 0;
        userAnswers = new Array(20).fill(null); // สร้างที่เก็บคำตอบว่างๆ 20 ช่อง
        
        displayQuestion();
        document.getElementById('nav-buttons').style.display = 'flex'; // โชว์ปุ่มนำทาง
    } catch (error) {
        document.getElementById('quiz-area').innerHTML = "<p style='color:red;'>ไม่สามารถดึงข้อสอบได้</p>";
    }
}

// 3. แสดงข้อสอบ
function displayQuestion() {
    // อัปเดต Progress Bar
    const progressPercent = ((currentQuestionIndex) / 20) * 100;
    document.getElementById('progress-bar-fill').style.width = `${progressPercent}%`;
    document.getElementById('progress-text').innerText = `ข้อที่ ${currentQuestionIndex + 1} / 20`;

    const quizArea = document.getElementById('quiz-area');
    const currentQuiz = quizQuestions[currentQuestionIndex];
    const savedAnswer = userAnswers[currentQuestionIndex]; // ดึงคำตอบที่เคยเลือกไว้

    let html = `<div style="margin-bottom: 20px; font-weight: 500; font-size: 18px; color: var(--navy); line-height: 1.5;">
                    ${currentQuestionIndex + 1}. ${currentQuiz.question}
                </div>`;

    currentQuiz.options.forEach((option, index) => {
        const optionNum = index + 1;
        // ถ้าข้อนี้เคยตอบไว้แล้ว ให้ใส่คลาส selected เพื่อไฮไลท์สี
        const isSelected = (savedAnswer === optionNum) ? 'selected' : '';
        html += `<button class="option-btn ${isSelected}" id="opt-${optionNum}" onclick="selectOption(${optionNum})">${optionNum}. ${option}</button>`;
    });

    quizArea.innerHTML = html;

    // จัดการปุ่มด้านล่าง (ถอยหลัง - เดินหน้า)
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    // ถ้าอยู่ข้อแรก ซ่อนปุ่มถอยหลัง
    prevBtn.style.visibility = (currentQuestionIndex === 0) ? 'hidden' : 'visible';
    
    // ถ้าอยู่ข้อสุดท้าย เปลี่ยนปุ่มถัดไปเป็นปุ่มส่งข้อสอบ
    if (currentQuestionIndex === 19) {
        nextBtn.innerText = "ส่งแบบทดสอบ ✅";
        nextBtn.style.backgroundColor = "#137333"; // สีเขียว
    } else {
        nextBtn.innerText = "ถัดไป ❯";
        nextBtn.style.backgroundColor = "var(--navy)";
    }
}

// 4. บันทึกคำตอบเมื่อจิ้มเลือก (Auto Save เบื้องหลัง)
function selectOption(selectedNum) {
    userAnswers[currentQuestionIndex] = selectedNum; // จำคำตอบลง Array
    
    // เปลี่ยนสีไฮไลท์
    for(let i=1; i<=4; i++) {
        document.getElementById(`opt-${i}`).classList.remove('selected');
    }
    document.getElementById(`opt-${selectedNum}`).classList.add('selected');
}

// 5. ปุ่มถัดไป / ส่งข้อสอบ
function nextQuestion() {
    // บังคับให้ต้องเลือกคำตอบก่อนถึงจะไปต่อได้
    if (userAnswers[currentQuestionIndex] === null) {
        alert("กรุณาเลือกคำตอบก่อนไปข้อถัดไปครับ");
        return;
    }

    if (currentQuestionIndex < 19) {
        currentQuestionIndex++;
        displayQuestion();
    } else {
        // อยู่ข้อ 20 กดยืนยันส่งข้อสอบ
        showModal(
            "ยืนยันการส่งแบบทดสอบ?", 
            "คุณทำข้อสอบครบแล้ว ต้องการส่งแบบทดสอบเพื่อดูผลคะแนนเลยใช่หรือไม่? (จะไม่สามารถกลับมาแก้ไขได้อีก)", 
            submitQuiz, 
            "ส่งข้อสอบ"
        );
    }
}

// 6. ปุ่มถอยหลังกลับไปแก้ไข
function promptPrevQuestion() {
    showModal(
        "ต้องการย้อนกลับ?", 
        "คุณต้องการกลับไปดูหรือแก้ไขคำตอบในข้อก่อนหน้าใช่หรือไม่?", 
        () => {
            currentQuestionIndex--;
            displayQuestion();
        }, 
        "ใช่, กลับไปแก้ไข"
    );
}

// ระบบ Modal แจ้งเตือน
function showModal(title, desc, confirmCallback, confirmText) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-desc').innerText = desc;
    
    const confirmBtn = document.getElementById('modal-confirm-btn');
    confirmBtn.innerText = confirmText;
    confirmBtn.onclick = () => { closeModal(); confirmCallback(); };

    document.getElementById('custom-modal').style.display = 'flex';
}
function closeModal() { document.getElementById('custom-modal').style.display = 'none'; }
function promptExitQuiz() { showModal("ออกจากระบบ?", "คะแนนที่ทำไว้จะสูญหาย ต้องการออกใช่หรือไม่?", () => location.reload(), "ออกจากระบบ"); }

// 7. คำนวณคะแนนตอนจบและแสดงผล
async function submitQuiz() {
    let finalScore = 0;
    
    // ตรวจคำตอบทั้งหมด 20 ข้อ
    for(let i=0; i<20; i++) {
        if (userAnswers[i] === quizQuestions[i].answer) {
            finalScore++;
        }
    }

    document.getElementById('progress-bar-fill').style.width = '100%';
    document.getElementById('progress-text').innerText = `ทำครบ 20 / 20 ข้อ`;
    document.getElementById('quiz-screen').classList.remove('active');
    document.getElementById('result-screen').classList.add('active');

    const passed = finalScore >= 16;
    const statusBg = passed ? "#e6f4ea" : "#fce8e6";
    const statusColor = passed ? "#137333" : "#c5221f";

    document.getElementById('result-area').innerHTML = `
        <div style="text-align: center; padding: 30px; border-radius: 16px; background-color: ${statusBg}; color: ${statusColor}; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0;">${passed ? "🎉 ผ่านเกณฑ์" : "❌ ไม่ผ่านเกณฑ์"}</h3>
            <p style="font-size: 40px; font-weight: 600; margin: 0;">${finalScore} / 20</p>
            <p style="margin: 10px 0 0 0;">คิดเป็น ${(finalScore/20*100)}% (เกณฑ์ผ่าน 80%)</p>
        </div>
    `;

    // บันทึกลง Firebase
    try {
        await db.collection('quiz_results').add({
            employee_id: currentUser.empId, employee_name: currentUser.empName, department: currentUser.empDept,
            score: finalScore, total_questions: 20, percentage: (finalScore / 20 * 100),
            status: passed ? "ผ่าน" : "ไม่ผ่าน", timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) { console.error("Error saving:", error); }
}

// 8. หน้าจอทบทวนคำตอบ (Review)
function showReviewScreen() {
    document.getElementById('result-screen').classList.remove('active');
    document.getElementById('review-screen').classList.add('active');

    const reviewArea = document.getElementById('review-area');
    let html = '';

    quizQuestions.forEach((q, i) => {
        const uAns = userAnswers[i];
        const cAns = q.answer;
        const isCorrect = (uAns === cAns);

        html += `
            <div class="review-item">
                <div class="review-q">${i + 1}. ${q.question}</div>
                <div class="review-ans">
                    <b>คุณตอบ:</b> <span class="${isCorrect ? 'correct-text' : 'wrong-text'}">${q.options[uAns - 1]}</span>
                </div>
                ${!isCorrect ? `<div class="review-ans"><b>เฉลย:</b> <span class="correct-text">${q.options[cAns - 1]}</span></div>` : ''}
                ${q.explanation ? `<div class="exp-box">💡 <b>คำอธิบาย:</b> ${q.explanation}</div>` : ''}
            </div>
        `;
    });
    reviewArea.innerHTML = html;
}
