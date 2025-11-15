import { NextRequest, NextResponse } from 'next/server';
import { EstimationCoordinator } from '@/lib/estimation-coordinator';
import { UserInput, ApiResponse, CostEstimateReport } from '@/types';

// 存储活跃的估算任务
const activeEstimations = new Map<string, any>();

// 设置超时时间（毫秒）
const ESTIMATION_TIMEOUT = 60000; // 60秒

export async function POST(request: NextRequest) {
  try {
    const userInput: UserInput = await request.json();
    console.log('Received user input:', userInput);

    // 验证用户输入
    const coordinator = new EstimationCoordinator();
    const validation = coordinator.validateUserInput(userInput);

    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input',
        message: validation.errors.join(', ')
      } as ApiResponse<null>, { status: 400 });
    }

    // 生成唯一任务ID
    const taskId = Math.random().toString(36).substr(2, 9);
    console.log('Generated task ID:', taskId);

    // 初始化任务状态
    activeEstimations.set(taskId, {
      progress: { step: 'tuition', progress: 0, message: '开始费用估算...' },
      userInput
    });

    // 创建超时Promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Estimation timeout'));
      }, ESTIMATION_TIMEOUT);
    });

    // 启动异步估算任务
    const estimationPromise = coordinator.generateCostEstimate(userInput, (progress) => {
      // 存储进度信息
      activeEstimations.set(taskId, { progress, userInput });
      console.log('Progress update:', progress);
    });

    // 启动估算任务但设置超时
    Promise.race([estimationPromise, timeoutPromise])
      .then((report: any) => {
        console.log('Estimation completed for task:', taskId);
        activeEstimations.set(taskId, {
          completed: true,
          report,
          userInput
        });
      })
      .catch((error) => {
        console.error('Estimation failed for task:', taskId, error);
        activeEstimations.set(taskId, {
          error: error.message || 'Estimation failed',
          userInput
        });
      });

    return NextResponse.json({
      success: true,
      data: { taskId },
      message: 'Estimation started'
    } as ApiResponse<{ taskId: string }>);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const taskId = url.searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({
      success: false,
      error: 'Missing taskId parameter'
    } as ApiResponse<null>, { status: 400 });
  }

  const taskData = activeEstimations.get(taskId);

  if (!taskData) {
    return NextResponse.json({
      success: false,
      error: 'Task not found or expired'
    } as ApiResponse<null>, { status: 404 });
  }

  if (taskData.error) {
    // 清理出错的任务
    activeEstimations.delete(taskId);
    
    return NextResponse.json({
      success: false,
      error: taskData.error
    } as ApiResponse<null>, { status: 500 });
  }

  if (taskData.completed) {
    // 清理完成的任务
    activeEstimations.delete(taskId);

    return NextResponse.json({
      success: true,
      data: taskData.report
    } as ApiResponse<any>);
  }

  return NextResponse.json({
    success: true,
    data: {
      progress: taskData.progress,
      status: 'in_progress'
    }
  } as ApiResponse<any>);
}