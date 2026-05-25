import asyncio
import logging
from pathlib import Path
from typing import Callable, Optional

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

logger = logging.getLogger(__name__)

class IDEFileEventHandler(FileSystemEventHandler):
    def __init__(self, callback: Callable[[str, str], None]):
        self.callback = callback

    def on_created(self, event):
        if not event.is_directory:
            self.callback("created", event.src_path)

    def on_deleted(self, event):
        if not event.is_directory:
            self.callback("deleted", event.src_path)

    def on_moved(self, event):
        if not event.is_directory:
            self.callback("moved", event.dest_path)

class FileWatcher:
    def __init__(self):
        self.observer: Optional[Observer] = None
        self.root_path: Optional[str] = None
        self.callback: Optional[Callable[[str, str], None]] = None

    def start(self, path: str, callback: Callable[[str, str], None]):
        if self.observer:
            self.stop()
        
        self.root_path = path
        self.callback = callback
        self.observer = Observer()
        event_handler = IDEFileEventHandler(callback)
        self.observer.schedule(event_handler, path, recursive=True)
        self.observer.start()
        logger.info(f"File watcher started on {path}")

    def stop(self):
        if self.observer:
            self.observer.stop()
            self.observer.join()
            self.observer = None
            logger.info("File watcher stopped")

file_watcher = FileWatcher()
