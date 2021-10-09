const { Telegraf, Markup } = require('telegraf')
const flibusta = require('flibusta-api')
const axios = require('axios')
var users = []
const bot = new Telegraf('2083172598:AAGmulOkVjxq0f3lHbzeuxwPwdPtezbk8Yo');


bot.command('start', ctx => {
    bot.telegram.sendMessage(ctx.chat.id, 'Короче. Пишешь название книги и я найду, окда.', {
    })
})

bot.on('text', (ctx) => {
    searchStuff(ctx)
})

async function searchStuff(ctx){
    if(users.includes(ctx.message.chat.id)){
        console.log(users)
        ctx.reply(`Погоди, я еще предыдущее ищу`)
        return
    }
    users.push(ctx.message.chat.id)
    console.log(`<${ctx.message.chat.id}> starting search for <${ctx.message.text}> [${users}]`)
    ctx.reply(`Ищем! Флибуста может тупить, так шо терпение`)
    let success = false;
    let books = undefined;
    try{
        books = await flibusta.searchBooks(ctx.message.text);
        console.log(`Found ${books.length} results for <${ctx.message.text}>`)
        if(books.length > 0){
            ctx.replyWithMarkdown('Так, шото есть, проверяем ссылочки..')
            success = true
        }
        let booksCount = 0
        for (const book of books) {
            let found = await checkBookAndReply(ctx, book)
            if(found){
                booksCount++
            }
        }
        users = arrayRemove(users, ctx.message.chat.id)
        console.log(`Done! Valid results count for <${ctx.message.text}> is ${booksCount}. [${users}]`)
        if(booksCount <= 0 && books.length > 0){
            ctx.replyWithMarkdown('Не, ничо нема, сорян. Все ссылки битые или с авторскими правами')
        }

        if(booksCount > 0){
            ctx.reply('Я всьо :3')
        }
    }catch (error){
        console.log(error)
        ctx.reply('Обосрался, сорре')
    }
    finally{
        if(!success){
            ctx.reply('Не, нема. Попробуй как-то по другому ввести, хз')
            users = arrayRemove(users, ctx.message.chat.id)
            console.log(`Done! [${users}]`)
        }
    }
}

function arrayRemove(arr, value) { 
    
    return arr.filter(function(ele){ 
        return ele != value; 
    });
}

bot.action(/dbfb2+/, (ctx) => {
    let id = ctx.match.input.substring(5);

    // add all necessary validations for the product_id here
    getBook(ctx, id, 'fb2')
});

bot.action(/dbmobi+/, (ctx) => {
    let id = ctx.match.input.substring(6);

    // add all necessary validations for the product_id here
    getBook(ctx, id, 'mobi')
});

bot.action(/dbpdf+/, (ctx) => {
    let id = ctx.match.input.substring(5);

    // add all necessary validations for the product_id here
    getBook(ctx, id, 'pdf')
});

async function getBook(ctx, id, arg){
    let book = await flibusta.downBook(id, arg)
    let bookName = book.fileName.split('.')[0].replace('\"', '');
    console.log(`Dowloading ${bookName}`)
    ctx.replyWithDocument({ source: book.file , filename: `${bookName}.${arg}`})
}

async function isValidURL(bookURL){
    
    const response = await axios({
        url: bookURL,
        method: 'GET',
        timeout:2000,
        responseType: 'stream',
      });
      if(response.headers['content-disposition'] != undefined){
        const fileName = response.headers['content-disposition'].slice(21);
        return fileName != undefined
      }
      else{
          return false
      }
}

async function checkBookAndReply(ctx, book){
    let fb2URL = flibusta.getUrl(book.id, 'fb2')

    try{
        let isFb2Valid = await isValidURL(fb2URL)
        if(isFb2Valid){
            ctx.replyWithMarkdown(
            `${book.author} - ${book.title}\n\n _Скачать по ссылке:_ [FB2](${fb2URL})`,
               Markup.inlineKeyboard([
               Markup.button.callback('Скачать файлом', `dbfb2${book.id}`),
               ]))
            return true
        }
    }
    catch(error){
        return false;
    }
    finally{

    }
}

bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))