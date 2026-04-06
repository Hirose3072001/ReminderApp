import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ParsedCommand {
  action: 'create' | 'unknown';
  type: 'event' | 'task';
  title: string;
  dateTime: string;
  subtasks?: string[];
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Dịch vụ xử lý ngôn ngữ tự nhiên cho trợ lý AI.
 * Chỉ sử dụng Google Gemini để đảm bảo độ chính xác cao nhất.
 */
export const aiService = {
  /**
   * Phân tích câu lệnh của người dùng bằng AI (Gemini)
   */
  parseCommand: async (text: string): Promise<ParsedCommand> => {
    if (!GEMINI_API_KEY) {
      console.error('❌ Gemini API Key missing.');
      return { action: 'unknown', type: 'task', title: '', dateTime: new Date().toISOString() };
    }

    try {
      const model = genAI.getGenerativeModel(
        { 
          model: "gemini-2.5-flash",
          generationConfig: { responseMimeType: "application/json" }
        },
        { apiVersion: "v1beta" }
      );

      const now = new Date();
      const localTimeStr = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      
      const prompt = `
        Bạn là một trợ lý quản lý lịch trình thông minh.
        Hãy phân tích câu lệnh tiếng Việt sau và trả về định dạng JSON duy nhất.
        
        Câu lệnh: "${text}"
        Thời gian hiện tại (Local GMT+7): ${localTimeStr}
        
        Quy tắc:
        1. "type": "task" nếu là công việc cần làm, "event" nếu là sự kiện/lịch họp.
        2. "action": "create" nếu người dùng muốn tạo mới, "unknown" nếu không rõ.
        3. "dateTime": Chuyển đổi thời gian người dùng nói sang ISO 8601 string với múi giờ +07:00 (Ví dụ: 2024-03-25T15:00:00+07:00). 
           - Nếu người dùng nói "15h" hoặc "3h chiều", hãy hiểu là 15:00:00+07:00.
           - Nếu không có giờ, mặc định 09:00:00+07:00.
        4. "subtasks": Danh sách các nhiệm vụ con (nếu có). Trả về mảng string.
        5. "title": Tiêu đề ngắn gọn, viết hoa chữ cái đầu.
        
        JSON Schema:
        {
          "action": "create" | "unknown",
          "type": "task" | "event",
          "title": "tên sự kiện/công việc",
          "dateTime": "YYYY-MM-DDTHH:mm:ss+07:00",
          "subtasks": ["nhiệm vụ 1", "nhiệm vụ 2"]
        }
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      return JSON.parse(responseText) as ParsedCommand;
    } catch (error) {
      console.error('❌ Gemini Parsing Error:', error);
      return { 
        action: 'unknown', 
        type: 'task', 
        title: '', 
        dateTime: new Date().toISOString(),
        subtasks: []
      };
    }
  }
};
