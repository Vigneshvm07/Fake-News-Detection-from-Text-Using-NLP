const $ = id => document.getElementById(id);

const newsInput = $("newsInput");
const analyzeBtn = $("analyzeBtn");

let statistics = {
    real: 0,
    uncertain: 0,
    fake: 0
};

let history = [];
let newsChart;


// ============================================
// NLP DICTIONARIES
// ============================================

const suspiciousWords = {
    shocking: 3,
    unbelievable: 3,
    secret: 2,
    miracle: 3,
    scam: 3,
    conspiracy: 3,
    exposed: 2,
    hidden: 2,
    banned: 2,
    censored: 3,
    terrifying: 3,
    dangerous: 2,
    unbelievable: 3,
    viral: 1,
    leaked: 2,
    hoax: 3,
    fake: 3,
    corrupt: 2,
    suppressed: 3,
    "they": 0.5
};


const reliableWords = {
    study: 2,
    research: 2,
    researchers: 2,
    university: 2,
    scientist: 2,
    scientists: 2,
    published: 2,
    peer: 2,
    journal: 2,
    evidence: 2,
    official: 2,
    government: 2,
    report: 1,
    reports: 1,
    according: 1,
    data: 2,
    statistics: 2,
    participants: 1,
    survey: 1,
    analysis: 2,
    department: 1,
    institution: 2
};


const clickbaitWords = [
    "shocking",
    "breaking",
    "you won't believe",
    "you will not believe",
    "secret",
    "miracle",
    "must see",
    "must read",
    "share this",
    "before it gets deleted",
    "doctors hate",
    "revealed",
    "exposed",
    "what happens next",
    "this is why"
];


const emotionalWords = [
    "shocking",
    "terrifying",
    "horrifying",
    "amazing",
    "unbelievable",
    "miracle",
    "outrage",
    "angry",
    "fear",
    "scary",
    "dangerous",
    "destroy",
    "disaster",
    "disgusting",
    "insane"
];


const certaintyWords = [
    "always",
    "never",
    "everyone",
    "nobody",
    "guaranteed",
    "definitely",
    "absolutely",
    "100%",
    "proves",
    "proof",
    "undeniable"
];


const hedgeWords = [
    "may",
    "might",
    "could",
    "possibly",
    "appears",
    "suggests",
    "likely",
    "potentially",
    "according"
];


// ============================================
// INPUT
// ============================================

newsInput.addEventListener("input", () => {

    $("charCount").textContent =
        `${newsInput.value.length} / 5000`;

});


$("clearBtn").addEventListener("click", () => {

    newsInput.value = "";

    $("charCount").textContent = "0 / 5000";

    resetResult();

});


document.querySelectorAll(".example-btn").forEach(button => {

    button.addEventListener("click", () => {

        newsInput.value =
            button.dataset.example;

        $("charCount").textContent =
            `${newsInput.value.length} / 5000`;

        newsInput.focus();

    });

});


// ============================================
// ANALYZE BUTTON
// ============================================

analyzeBtn.addEventListener("click", () => {

    const text = newsInput.value.trim();

    if (!text) {

        alert("Please enter some news content first.");

        return;
    }

    analyzeBtn.disabled = true;

    analyzeBtn.textContent =
        "Analyzing...";

    setTimeout(() => {

        const result =
            analyzeNews(text);

        displayResult(result);

        displayInsights(result);

        updateStatistics(result.classification);

        addHistory(text, result);

        analyzeBtn.disabled = false;

        analyzeBtn.textContent =
            "✦ Detect Fake News";

    }, 500);

});


// ============================================
// TEXT PREPROCESSING
// ============================================

function tokenize(text) {

    return text
        .toLowerCase()
        .replace(/[^\w\s%'-]/g, " ")
        .split(/\s+/)
        .filter(Boolean);

}


// ============================================
// CLICKBAIT DETECTION
// ============================================

function detectClickbait(text) {

    const lowerText =
        text.toLowerCase();

    let score = 0;

    let matches = [];

    clickbaitWords.forEach(phrase => {

        if (lowerText.includes(phrase)) {

            score += 2;

            matches.push(phrase);

        }

    });

    const exclamationCount =
        (text.match(/!/g) || []).length;

    const questionCount =
        (text.match(/\?/g) || []).length;

    const uppercaseLetters =
        (text.match(/[A-Z]/g) || []).length;

    const letters =
        (text.match(/[A-Za-z]/g) || []).length;

    const uppercaseRatio =
        letters > 0
            ? uppercaseLetters / letters
            : 0;

    if (exclamationCount >= 3) {

        score += 2;

        matches.push("excessive exclamation");

    }

    if (questionCount >= 3) {

        score += 1;

        matches.push("multiple questions");

    }

    if (uppercaseRatio > 0.45 && letters > 15) {

        score += 2;

        matches.push("excessive capitalization");

    }

    return {
        score,
        matches
    };

}


// ============================================
// KEYWORD ANALYSIS
// ============================================

function detectKeywords(tokens) {

    let suspicious = [];
    let reliable = [];

    tokens.forEach(word => {

        if (suspiciousWords[word]) {

            suspicious.push({
                word,
                score: suspiciousWords[word]
            });

        }

        if (reliableWords[word]) {

            reliable.push({
                word,
                score: reliableWords[word]
            });

        }

    });

    return {
        suspicious,
        reliable
    };

}


// ============================================
// EMOTIONAL LANGUAGE
// ============================================

function detectEmotionalLanguage(tokens) {

    return tokens.filter(word =>
        emotionalWords.includes(word)
    );

}


// ============================================
// CERTAINTY / HEDGING
// ============================================

function detectLanguageStyle(tokens) {

    const certainty =
        tokens.filter(word =>
            certaintyWords.includes(word)
        );

    const hedging =
        tokens.filter(word =>
            hedgeWords.includes(word)
        );

    return {
        certainty,
        hedging
    };

}


// ============================================
// MAIN NLP ANALYSIS
// ============================================

function analyzeNews(text) {

    const tokens =
        tokenize(text);

    const keywordResult =
        detectKeywords(tokens);

    const clickbait =
        detectClickbait(text);

    const emotional =
        detectEmotionalLanguage(tokens);

    const language =
        detectLanguageStyle(tokens);


    let suspiciousScore = 0;

    let reliabilityScore = 0;


    // Suspicious keywords

    keywordResult.suspicious.forEach(item => {

        suspiciousScore += item.score;

    });


    // Reliable keywords

    keywordResult.reliable.forEach(item => {

        reliabilityScore += item.score;

    });


    // Clickbait

    suspiciousScore +=
        clickbait.score;


    // Emotional language

    suspiciousScore +=
        emotional.length * 0.8;


    // Excessive certainty

    suspiciousScore +=
        language.certainty.length * 0.7;


    // Reliable hedging language

    reliabilityScore +=
        language.hedging.length * 0.5;


    // Text length

    const wordCount =
        tokens.length;


    if (wordCount < 8) {

        suspiciousScore += 1;

    }


    // URLs can be useful but unknown links
    // do not prove credibility

    const hasURL =
        /https?:\/\//i.test(text);

    if (hasURL) {

        reliabilityScore += 0.5;

    }


    // Classification

    let classification;

    const difference =
        suspiciousScore -
        reliabilityScore;


    if (
        suspiciousScore >= 5 &&
        difference >= 2
    ) {

        classification = "Fake";

    } else if (
        reliabilityScore >= 5 &&
        difference <= -2
    ) {

        classification = "Real";

    } else {

        classification = "Uncertain";

    }


    // Confidence

    const signalStrength =
        Math.abs(difference);

    let confidence =
        Math.round(
            55 +
            signalStrength * 6
        );

    confidence =
        Math.max(
            55,
            Math.min(96, confidence)
        );


    if (
        classification === "Uncertain"
    ) {

        confidence =
            Math.min(confidence, 70);

    }


    // Distribution scores

    let realScore = 0;
    let fakeScore = 0;
    let uncertainScore = 0;


    if (classification === "Real") {

        realScore = confidence;

        uncertainScore =
            Math.round((100 - confidence) * 0.7);

        fakeScore =
            100 -
            realScore -
            uncertainScore;

    } else if (
        classification === "Fake"
    ) {

        fakeScore = confidence;

        uncertainScore =
            Math.round((100 - confidence) * 0.7);

        realScore =
            100 -
            fakeScore -
            uncertainScore;

    } else {

        uncertainScore = confidence;

        realScore =
            Math.round((100 - confidence) / 2);

        fakeScore =
            100 -
            uncertainScore -
            realScore;

    }


    return {

        classification,

        confidence,

        realScore,

        uncertainScore,

        fakeScore,

        suspiciousScore,

        reliabilityScore,

        suspiciousKeywords:
            keywordResult.suspicious,

        reliableKeywords:
            keywordResult.reliable,

        clickbait,

        emotional,

        certainty:
            language.certainty,

        hedging:
            language.hedging,

        wordCount,

        hasURL

    };

}


// ============================================
// DISPLAY RESULT
// ============================================

function displayResult(result) {

    const icons = {

        Real: "✓",

        Fake: "!",

        Uncertain: "?"

    };


    const messages = {

        Real:
            "The content contains several linguistic signals associated with reliable reporting.",

        Fake:
            "The content contains multiple suspicious linguistic and clickbait signals.",

        Uncertain:
            "The available text signals are not strong enough to make a reliable classification."

    };


    $("resultIcon").textContent =
        icons[result.classification];

    $("resultTitle").textContent =
        result.classification === "Real"
            ? "Likely Reliable"
            : result.classification === "Fake"
                ? "Potentially Fake"
                : "Needs Verification";


    $("resultMessage").textContent =
        messages[result.classification];


    $("confidenceValue").textContent =
        `${result.confidence}%`;


    $("confidenceBar").style.width =
        `${result.confidence}%`;


    $("realScore").textContent =
        `${result.realScore}%`;

    $("uncertainScore").textContent =
        `${result.uncertainScore}%`;

    $("fakeScore").textContent =
        `${result.fakeScore}%`;


    $("resultStatus").textContent =
        "COMPLETED";


    let color;

    if (result.classification === "Real") {

        color = "#20a77b";

    } else if (
        result.classification === "Fake"
    ) {

        color = "#e55d70";

    } else {

        color = "#d99b2b";

    }


    $("confidenceBar").style.background =
        color;


    $("resultIcon").style.color =
        color;

}


// ============================================
// INSIGHTS
// ============================================

function displayInsights(result) {

    const signalBox =
        $("signals");

    signalBox.replaceChildren();


    const signals = [];


    if (result.clickbait.matches.length > 0) {

        signals.push({
            text:
                "Clickbait patterns detected: " +
                result.clickbait.matches.join(", "),
            warning: true
        });

    }


    if (result.suspiciousKeywords.length > 0) {

        signals.push({
            text:
                "Suspicious vocabulary detected.",
            warning: true
        });

    }


    if (result.emotional.length >= 2) {

        signals.push({
            text:
                "High emotional language detected.",
            warning: true
        });

    }


    if (result.certainty.length >= 2) {

        signals.push({
            text:
                "Strong certainty claims detected.",
            warning: true
        });

    }


    if (result.reliableKeywords.length > 0) {

        signals.push({
            text:
                "Evidence-oriented vocabulary detected.",
            warning: false
        });

    }


    if (result.hedging.length > 0) {

        signals.push({
            text:
                "Cautious language detected.",
            warning: false
        });

    }


    if (signals.length === 0) {

        signals.push({
            text:
                "No strong linguistic signals detected.",
            warning: false
        });

    }


    signals.forEach(signal => {

        const item =
            document.createElement("div");

        item.className =
            "signal-item " +
            (signal.warning
                ? "warning"
                : "safe");

        item.textContent =
            (signal.warning ? "⚠ " : "✓ ") +
            signal.text;

        signalBox.appendChild(item);

    });


    // Keywords

    const keywordBox =
        $("keywords");

    keywordBox.replaceChildren();


    const allKeywords = [

        ...result.suspiciousKeywords.map(
            item => ({
                word: item.word,
                warning: true
            })
        ),

        ...result.reliableKeywords.map(
            item => ({
                word: item.word,
                warning: false
            })
        )

    ];


    if (allKeywords.length === 0) {

        keywordBox.textContent =
            "No significant keywords detected.";

    } else {

        allKeywords.forEach(item => {

            const tag =
                document.createElement("span");

            tag.className =
                "keyword " +
                (item.warning
                    ? "warning"
                    : "");

            tag.textContent =
                item.word;

            keywordBox.appendChild(tag);

        });

    }


    // Content metrics

    const metrics =
        $("contentAnalysis");

    metrics.replaceChildren();


    createMetric(
        metrics,
        "Word count",
        result.wordCount
    );

    createMetric(
        metrics,
        "Suspicious signals",
        result.suspiciousScore.toFixed(1)
    );

    createMetric(
        metrics,
        "Reliability signals",
        result.reliabilityScore.toFixed(1)
    );

    createMetric(
        metrics,
        "Clickbait signals",
        result.clickbait.score
    );

    createMetric(
        metrics,
        "External URL",
        result.hasURL ? "Detected" : "None"
    );

}


function createMetric(
    parent,
    label,
    value
) {

    const row =
        document.createElement("div");

    row.className =
        "metric-row";


    const left =
        document.createElement("span");

    left.textContent =
        label;


    const right =
        document.createElement("strong");

    right.textContent =
        value;


    row.append(left, right);

    parent.appendChild(row);

}


// ============================================
// STATISTICS
// ============================================

function updateStatistics(
    classification
) {

    if (classification === "Real") {

        statistics.real++;

    } else if (
        classification === "Fake"
    ) {

        statistics.fake++;

    } else {

        statistics.uncertain++;

    }


    $("totalCount").textContent =
        statistics.real +
        statistics.uncertain +
        statistics.fake;


    $("realCount").textContent =
        statistics.real;

    $("uncertainCount").textContent =
        statistics.uncertain;

    $("fakeCount").textContent =
        statistics.fake;


    updateChart();

}


// ============================================
// CHART
// ============================================

function initializeChart() {

    const context =
        $("newsChart").getContext("2d");


    newsChart =
        new Chart(
            context,
            {

                type: "doughnut",

                data: {

                    labels: [
                        "Reliable",
                        "Uncertain",
                        "Suspicious"
                    ],

                    datasets: [
                        {

                            data: [
                                0,
                                0,
                                0
                            ],

                            backgroundColor: [
                                "#20a77b",
                                "#d99b2b",
                                "#e55d70"
                            ],

                            borderWidth: 0,

                            hoverOffset: 7

                        }
                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "72%",

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                usePointStyle: true,

                                padding: 18,

                                font: {

                                    family: "DM Sans",

                                    size: 11

                                }

                            }

                        }

                    }

                }

            }
        );

}


function updateChart() {

    if (!newsChart) {
        return;
    }


    newsChart.data
        .datasets[0]
        .data = [

            statistics.real,

            statistics.uncertain,

            statistics.fake

        ];


    newsChart.update();

}


// ============================================
// HISTORY
// ============================================

function addHistory(
    text,
    result
) {

    history.unshift({

        text,

        classification:
            result.classification,

        confidence:
            result.confidence,

        time:
            new Date().toLocaleTimeString()

    });


    if (history.length > 10) {

        history.pop();

    }


    renderHistory();

}


function renderHistory() {

    const list =
        $("historyList");

    list.replaceChildren();


    if (history.length === 0) {

        const empty =
            document.createElement("p");

        empty.className =
            "empty-history";

        empty.textContent =
            "No news analyzed yet.";

        list.appendChild(empty);

        return;

    }


    const icons = {

        Real: "✓",

        Fake: "!",

        Uncertain: "?"

    };


    history.forEach(item => {

        const row =
            document.createElement("div");

        row.className =
            "history-item";


        const icon =
            document.createElement("div");

        icon.className =
            "history-icon";

        icon.textContent =
            icons[item.classification];


        const content =
            document.createElement("div");

        content.className =
            "history-content";


        const title =
            document.createElement("strong");

        title.textContent =
            item.classification;


        const preview =
            document.createElement("small");

        preview.textContent =
            item.text;


        content.append(
            title,
            preview
        );


        const score =
            document.createElement("span");

        score.className =
            "history-score";

        score.textContent =
            `${item.confidence}%`;


        row.append(
            icon,
            content,
            score
        );


        list.appendChild(row);

    });

}


// ============================================
// CLEAR HISTORY
// ============================================

$("clearHistory").addEventListener(
    "click",
    () => {

        history = [];

        statistics = {
            real: 0,
            uncertain: 0,
            fake: 0
        };


        $("totalCount").textContent = "0";
        $("realCount").textContent = "0";
        $("uncertainCount").textContent = "0";
        $("fakeCount").textContent = "0";


        renderHistory();

        updateChart();

    }
);


// ============================================
// RESET
// ============================================

function resetResult() {

    $("resultIcon").textContent =
        "?";

    $("resultTitle").textContent =
        "Awaiting analysis";

    $("resultMessage").textContent =
        "Your news credibility result will appear here.";

    $("resultStatus").textContent =
        "WAITING";


    $("confidenceValue").textContent =
        "0%";

    $("confidenceBar").style.width =
        "0%";


    $("realScore").textContent =
        "0%";

    $("uncertainScore").textContent =
        "0%";

    $("fakeScore").textContent =
        "0%";


    $("signals").innerHTML =
        '<p class="empty">Detection signals will appear here.</p>';

    $("keywords").innerHTML =
        '<p class="empty">Keywords will appear here.</p>';

    $("contentAnalysis").innerHTML =
        '<p class="empty">Content metrics will appear here.</p>';

}


// Initialize

initializeChart();