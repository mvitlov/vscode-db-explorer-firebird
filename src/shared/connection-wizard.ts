import { window, Disposable, QuickInput, QuickInputButtons } from "vscode";
import { ConnectionOptions } from "../interfaces";
import { logger } from "../logger/logger";

export async function connectionWizard() {
  const title = "FIREBIRD: Add New Connection";

  async function collectInputs(): Promise<ConnectionOptions> {
    logger.info("Connection wizard start...");

    const options = {} as Partial<ConnectionOptions>;
    await MultiStepInput.run(input => host(input, options));
    return options as ConnectionOptions;
  }

  async function host(input: MultiStepInput, options: Partial<ConnectionOptions>) {
    options.host = await input.showInputBox({
      title,
      step: 1,
      totalSteps: 5,
      prompt: "[REQUIRED] The hostname of the database.",
      placeHolder: "e.g. 'localhost'",
      ignoreFocusOut: true
    });
    if (!options.host) {
      return Promise.reject("Hostname cannot be empty. Add Connection canceled.");
    } else {
      return (input: MultiStepInput) => database(input, options);
    }
  }

  async function database(input: MultiStepInput, options: Partial<ConnectionOptions>) {
    options.database = await input.showInputBox({
      title,
      step: 2,
      totalSteps: 5,
      prompt: "[REQUIRED] Absolute path to Firebird database.",
      placeHolder: "e.g. '/DB/pathtoyour/database.fdb'",
      ignoreFocusOut: true
    });
    if (!options.database) {
      return Promise.reject("Database cannot be empty. Add Connection canceled.");
    } else {
      return (input: MultiStepInput) => port(input, options);
    }
  }

  async function port(input: MultiStepInput, options: Partial<ConnectionOptions>) {
    options.port = await input.showInputBox({
      title,
      step: 3,
      totalSteps: 5,
      prompt: "[OPTIONAL] Port number. Leave empty for default.",
      placeHolder: "defaults to 3050",
      ignoreFocusOut: true
    });
    if (!options.port) {
      logger.info("Default port 3050 selected.");
      options.port = "3050";
    }
    return (input: MultiStepInput) => user(input, options);
  }

  async function user(input: MultiStepInput, options: Partial<ConnectionOptions>) {
    options.user = await input.showInputBox({
      title,
      step: 4,
      totalSteps: 5,
      prompt: "[OPTIONAL] Firebird user to authenticate as. Leave empty for default.",
      placeHolder: "defaults to SYSDBA",
      ignoreFocusOut: true
    });
    if (!options.user) {
      logger.info("Default user sysdba selected.");
      options.user = "sysdba";
    }
    return (input: MultiStepInput) => password(input, options);
  }

  async function password(input: MultiStepInput, options: Partial<ConnectionOptions>) {
    options.password = await input.showInputBox({
      title,
      step: 5,
      totalSteps: 5,
      prompt: "[OPTIONAL] The password of the Firebird user. Leave empty for default.",
      placeHolder: "defaults to masterkey",
      ignoreFocusOut: true,
      password: true
    });

    if (!options.password) {
      logger.info("Default password masterkey selected.");
      options.password = "masterkey";
    }
  }

  return await collectInputs();
}

class InputFlowAction {
  private constructor() {}
  static back = new InputFlowAction();
  static cancel = new InputFlowAction();
}

type InputStep = (input: MultiStepInput) => Thenable<InputStep | void>;

interface InputBoxParameters {
  title: string;
  step: number;
  totalSteps: number;
  prompt: string;
  placeHolder: string;
  ignoreFocusOut: boolean;
  password?: boolean;
}

class MultiStepInput {
  static async run<T>(start: InputStep) {
    const input = new MultiStepInput();
    return input.stepThrough(start);
  }

  private current?: QuickInput;
  private steps: InputStep[] = [];

  private async stepThrough<T>(start: InputStep) {
    let step: InputStep | void = start;
    while (step) {
      this.steps.push(step);
      try {
        step = await step(this);
      } catch (err) {
        if (err === InputFlowAction.back) {
          this.steps.pop();
          step = this.steps.pop();
        } else if (err === InputFlowAction.cancel) {
          step = undefined;
        } else {
          this.current.dispose();
          throw err;
        }
      }
    }
    if (this.current) {
      this.current.dispose();
    }
  }

  async showInputBox<P extends InputBoxParameters>({
    title,
    step,
    totalSteps,
    prompt,
    placeHolder,
    ignoreFocusOut,
    password
  }: P) {
    const disposables: Disposable[] = [];
    try {
      return await new Promise<string | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
        const input = window.createInputBox();
        input.title = title;
        input.step = step;
        input.totalSteps = totalSteps;
        input.prompt = prompt;
        input.placeholder = placeHolder;
        input.ignoreFocusOut = ignoreFocusOut;
        input.password = password || false;
        input.buttons = [...(this.steps.length > 1 ? [QuickInputButtons.Back] : [])];
        disposables.push(
          input.onDidTriggerButton(button => {
            if (button === QuickInputButtons.Back) {
              reject(InputFlowAction.back);
            } else {
              resolve(<any>button);
            }
          }),
          input.onDidAccept(async () => {
            const value = input.value;
            resolve(value);
          })
        );
        if (this.current) {
          this.current.dispose();
        }
        this.current = input;
        this.current.show();
      });
    } finally {
      disposables.forEach(d => d.dispose());
    }
  }
}
