const phoneNumberFormatter = function(number) {
    let formatted = number.replace(/\D/g,'')
    return formatted
}

module.exports =  {
    phoneNumberFormatter
}