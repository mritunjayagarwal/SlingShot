module.exports = function(Wallet, User, async){
    return {
        SetRouting: function(router){
            router.post('/wrsubmit', this.wrSubmit);
            router.post('/rwsubmit', this.rwSubmit);
        },
        wrSubmit: async function(req, res){
            var user = await User.findOne({ _id: req.user._id}).populate({ path: 'pay', model: 'Wallet'}).exec();
            if(req.body.wammount > user.pay.balance){
                req.flash("error", "Sorry! You can not withdraw more than ₹" + user.pay.balance);
                res.redirect('/');
            }else{
                Wallet.findOne({ owner: req.user._id, balance: { "$gte": req.body.wammount}}, ( err, wallet) => {
                    if(wallet){
                        Wallet.updateOne({
                            owner: req.user._id,
                            balance: { "$gte": req.body.wammount}
                        }, {
                            $push: {
                                history: { 
                                    amount: req.body.wammount,
                                    through: 'UPI',
                                    number: req.body.upiNum,
                                    name: req.body.holdername,
                                    upi: req.body.payThrough
                                }
                            },
                            $set: {
                                upi: {
                                 name: req.body.payThrough,
                                 holder: req.body.holdername,
                                 rnum: req.body.upiNum
                                }
                            }
                        }, (err) => {
                            req.flash('success', "Wallet Update Success");
                            res.redirect('/');
                        })
                    }
     
                    if(err){
                        req.flash("error", "An error occured while processing your request");
                        res.redirect('/')
                    }
     
                    if(!wallet){
                     const newWallet = new Wallet();
                     newWallet.owner = req.user._id;
                     newWallet.upi.name = req.body.payThrough;
                     newWallet.upi.holder = req.body.holdername
                     newWallet.upi.rnum = req.body.upiNum;
                     newWallet.save(() => {
                         console.log("Wallet Details Added Successfully");
                     });
         
                     User.updateOne({
                         _id: req.user._id
                     }, {
                         $push: {
                             pay: newWallet._id
                         }
                     }, (err) => {
                         console.log("User Update Success");
                     });

                    Wallet.updateOne({
                        _id: newWallet._id,
                        owner: req.user._id
                    }, {
                        $push: {
                            history: { 
                                amount: req.body.wammount,
                                through: 'UPI',
                                number: req.body.upiNum,
                                name: req.body.holdername,
                                upi: req.body.payThrough
                            }
                        }
                    })
                    req.flash('success', 'Withdraw request submitted successfully')
                    res.redirect('/')
                    }
                });
            }
        },
        rwSubmit: async function(req, res){
            var user = await User.findOne({ _id: req.user._id}).populate({ path: 'pay', model: 'Wallet'}).exec();
            if(req.body.rwammount > user.pay.balance){
                req.flash("error", "Sorry! You can not withdraw more than ₹" + user.pay.balance);
                res.redirect('/');
            }else{
                Wallet.findOne({ owner: req.user._id, 'upi.rnum': req.body.rUpiNum, balance: { "$gte": req.body.rwammount}}, (err, wallet) => {
                    if(wallet){
                        var name = wallet.upi.holder;
                        var upi = wallet.upi.name;
                        Wallet.updateOne({
                            owner: req.user._id, 
                            'upi.rnum': req.body.rUpiNum
                        }, {
                            $push: {
                                history: { 
                                    amount: req.body.rwammount,
                                    through: 'UPI',
                                    number: req.body.rUpiNum,
                                    name: name,
                                    upi: upi
                                }
                            }, $set: {
                                processing: true
                            }
                        }, (err) => {
                            if(err){
                                req.flash("error", "Something went wrong..please try again later");
                                res.redirect('/')
                            }else{
                                res.redirect('/');
                            }
                        })
                    }else{
                        req.flash("error", "Sorry! We could not find any wallet registered to you");
                        res.redirect('/');
                    }
                })
            }
        }
    }
}