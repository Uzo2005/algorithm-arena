import asynchttpserver, asyncdispatch
import checksums/md5

include ./dbutils

let server = newAsyncHttpServer()
server.listen(Port(2005))

echo "Server started on port 2005"

proc requestCallBack(req: Request) {.async, gcsafe.} =
    let 
        indexPage = readfile("index.html")
        clientJs = readfile("client.js")
        logoImg = readfile("logo.png")
        htmlHeaders = {"Content-type" : "text/html; charset=utf-8"}
        jsHeaders = {"Content-type": "text/javascript"}
        txtHeaders = {"Content-type": "text/plain"}
        pngHeaders = {"Content-type": "image/png"}


    case req.url.path:
        of "/":
            await req.respond(Http200, indexPage, htmlHeaders.newHttpHeaders())
        of "/client.js":
            await req.respond(Http200, clientJs, jsHeaders.newHttpHeaders())
        of "/logo.png":
            await req.respond(Http200, logoImg, pngHeaders.newHttpHeaders())
        of "/storeData":
            if req.reqMethod == HttpPost:
                let 
                    dataFromClient = req.body
                    md5hash = $toMD5(dataFromClient)

                db.storeThread(url = md5hash, data = dataFromClient)
                await req.respond(Http200, md5hash, txtHeaders.newHttpHeaders())
            else:
                await req.respond(Http200, "You can only POST here", txtHeaders.newHttpHeaders())
        
        else: #client is probably asking for data
            let 
                path = req.url.path[1..^1] #strip out the leading /
                data = db.getThreadData(url = path)
            await req.respond(Http200, if data.len > 0: data else: "NO DATA AT THIS URL!", txtHeaders.newHttpHeaders())

while true:
    if server.shouldAcceptRequest:
        waitFor server.acceptRequest(requestCallBack)
    else:
        waitFor sleepAsync(500)
