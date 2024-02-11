when isMainModule:
    import db_connector/db_sqlite

    let db = open("storage.db", "", "", "")

    db.exec(sql"""
                CREATE TABLE IF NOT EXISTS threadStore(
                    url TEXT NOT NULL,
                    data TEXT NOT NULL
                )
    """)

    db.close()

