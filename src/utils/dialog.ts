export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export function showConfirmDialog(
  options: ConfirmDialogOptions
): Promise<boolean> {
  const {
    title = "确认操作",
    message,
    confirmText = "确定",
    cancelText = "取消",
  } = options;

  return new Promise<boolean>((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "app-modal-overlay";

    const dialog = document.createElement("div");
    dialog.className = "app-modal";

    const header = document.createElement("div");
    header.className = "app-modal-header";
    header.textContent = title;

    const body = document.createElement("div");
    body.className = "app-modal-body";
    body.textContent = message;

    const footer = document.createElement("div");
    footer.className = "app-modal-footer";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-outline-secondary";
    cancelBtn.textContent = cancelText;

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "btn btn-primary";
    confirmBtn.textContent = confirmText;

    const cleanup = (result: boolean) => {
      overlay.classList.remove("show");
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 150);
    };

    cancelBtn.addEventListener("click", () => cleanup(false));
    confirmBtn.addEventListener("click", () => cleanup(true));

    overlay.addEventListener("click", (evt) => {
      if (evt.target === overlay) {
        cleanup(false);
      }
    });

    footer.append(cancelBtn, confirmBtn);
    dialog.append(header, body, footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add("show");
    });
  });
}

