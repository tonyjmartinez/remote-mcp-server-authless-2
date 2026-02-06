export type TaskStatus = "pending" | "running" | "completed" | "failed";
export type TaskType = "data_processing" | "image_generation" | "report_generation" | "batch_calculation";

export interface OrchestrationTask {
	id: string;
	type: TaskType;
	status: TaskStatus;
	progress: number;
	createdAt: Date;
	startedAt?: Date;
	completedAt?: Date;
	result?: unknown;
	error?: string;
	params: Record<string, unknown>;
}

export class MoltbotOrchestrator {
	private readonly tasks = new Map<string, OrchestrationTask>();

	createTask(type: TaskType, params: Record<string, unknown>, idPrefix = "task"): OrchestrationTask {
		const taskId = `${idPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const task: OrchestrationTask = {
			id: taskId,
			type,
			status: "pending",
			progress: 0,
			createdAt: new Date(),
			params,
		};

		this.tasks.set(taskId, task);
		void this.processTask(taskId);
		return task;
	}

	createBatch(items: number[], operation: "square" | "cube" | "factorial") {
		const batchId = `batch_${Date.now()}`;
		const tasks = items.map((item, index) =>
			this.createTask("batch_calculation", { item, operation }, `${batchId}_${index}`),
		);

		return { batchId, tasks };
	}

	getTask(taskId: string) {
		return this.tasks.get(taskId);
	}

	listTasks(status: "all" | TaskStatus = "all") {
		const all = Array.from(this.tasks.values());
		return status === "all" ? all : all.filter(task => task.status === status);
	}

	getStats() {
		const allTasks = this.listTasks();
		return {
			total: allTasks.length,
			pending: allTasks.filter(t => t.status === "pending").length,
			running: allTasks.filter(t => t.status === "running").length,
			completed: allTasks.filter(t => t.status === "completed").length,
			failed: allTasks.filter(t => t.status === "failed").length,
			recent: allTasks.slice(-10).reverse(),
		};
	}

	private async processTask(taskId: string) {
		const task = this.tasks.get(taskId);
		if (!task) {
			return;
		}

		task.status = "running";
		task.startedAt = new Date();
		task.progress = 10;

		const steps = [25, 50, 75, 90, 100];
		for (const progress of steps) {
			await new Promise(resolve => setTimeout(resolve, 500));
			task.progress = progress;
		}

		task.status = "completed";
		task.completedAt = new Date();
		task.result = this.buildResult(taskId, task);
	}

	private buildResult(taskId: string, task: OrchestrationTask) {
		switch (task.type) {
			case "data_processing":
				return {
					processed: task.params.records ?? 100,
					duration: Date.now() - task.createdAt.getTime(),
				};
			case "batch_calculation": {
				const item = Number(task.params.item ?? 0);
				const operation = String(task.params.operation ?? "square");
				let output = item * item;
				if (operation === "cube") {
					output = item * item * item;
				}
				if (operation === "factorial") {
					output = 1;
					for (let i = 2; i <= item; i++) {
						output *= i;
					}
				}
				return { input: item, operation, output };
			}
			case "image_generation":
				return {
					imageUrl: `https://placeholder.example/image_${taskId}.png`,
					format: "png",
					size: "1024x1024",
				};
			case "report_generation":
				return {
					reportUrl: `https://placeholder.example/report_${taskId}.pdf`,
					pages: Math.floor(Math.random() * 10) + 5,
				};
		}
	}
}
