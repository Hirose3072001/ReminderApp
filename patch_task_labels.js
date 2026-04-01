const fs = require('fs');
const path = 'c:\\Users\\minhtc\\Coding\\Remind_App\\src\\screens\\AddTaskScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// Patch 3: Update Task push templates
const patch3Old = /const body = isEvent \n\s+\? \`\$\{titlePrefix\}\\nSự kiện "\$\{title.trim\(\)\}" \$\{rule.timing === 'Khi bắt đầu' \? 'đã bắt đầu' : 'đã kết thúc'\}\`\n\s+: \`Nhắc lịch\\nCông việc "\$\{title.trim\(\)\}" \$\{rule.timing === 'Khi bắt đầu' \? 'đã bắt đầu' : 'đã kết thúc'\}\`;/m;
const patch3New = `const body = isEvent 
                  ? \`\${titlePrefix}\\nSự kiện "\${title.trim()}" \${rule.timing === 'Khi bắt đầu' ? 'đã bắt đầu' : 'đã kết thúc'}\`
                  : \`Nhắc lịch\\nCông việc "\${title.trim()}" \${rule.timing === 'Khi bắt đầu' ? 'đã bắt đầu' : 'đã kết thúc'}\`;`;

// Note: Patch 3 is actually already correct in terms of phrasing for "Khi bắt đầu/kết thúc".

// Patch 4: Update Task offset templates
const patch4Old = /const customBody = isEvent \n\s+\? \`\$\{titlePrefix\}\\nSự kiện "\$\{title.trim\(\)\}" \$\{actionText\}\`\n\s+: \`Nhắc lịch\\nCông việc "\$\{title.trim\(\)\}" \$\{rule.timing === 'Trước khi bắt đầu' \? 'sắp tới hạn' : 'đang tới hạn'\}\`;/m;
const patch4New = `const customBody = isEvent 
                  ? \`\${titlePrefix}\\nSự kiện "\${title.trim()}" \${actionText}\`
                  : \`Nhắc lịch\\nCông việc "\${title.trim()}" \${rule.timing === 'Trước khi bắt đầu' ? \`sẽ bắt đầu vào lúc \${format(new Date(startTime), 'HH:mm')}\` : \`sẽ kết thúc vào lúc \${format(new Date(endTime), 'HH:mm')}\`} chưa được hoàn thành\`;`;

content = content.replace(patch4Old, patch4New);

fs.writeFileSync(path, content);
console.log('Successfully patched AddTaskScreen.tsx Task templates');
