import db_connector/db_sqlite

let db = open("storage.db", "", "", "")

proc storeThread(db: DbConn, url, data: string) =
    db.exec(sql"""INSERT INTO  threadStore (url, data) VALUES (?, ?)""", url, data)

proc getThreadData(db: DbConn, url: string): string = db.getValue(sql"""SELECT data FROM threadStore WHERE url = ?""", url)